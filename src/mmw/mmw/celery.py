from __future__ import absolute_import

import os
import rollbar
import logging

from celery import Celery
from celery._state import connect_on_app_finalize
from celery.signals import task_failure

from django.conf import settings


@connect_on_app_finalize
def add_unlock_chord_task_shim(app):
    """
    Override native unlock_chord to support configurable max_retries.
    Original code taken from https://goo.gl/3mX0ie

    This task is used by result backends without native chord support.
    It joins chords by creating a task chain polling the header for completion.
    """
    from celery.canvas import maybe_signature
    from celery.exceptions import ChordError
    from celery.result import allow_join_result, result_from_tuple

    logger = logging.getLogger(__name__)

    MAX_RETRIES = settings.CELERY_CHORD_UNLOCK_MAX_RETRIES

    @app.task(name='celery.chord_unlock', shared=False, default_retry_delay=1,
              ignore_result=True, lazy=False, bind=True,
              max_retries=MAX_RETRIES)
    def unlock_chord(self, group_id, callback, interval=None,
                     max_retries=MAX_RETRIES, result=None,
                     Result=app.AsyncResult, GroupResult=app.GroupResult,
                     result_from_tuple=result_from_tuple, **kwargs):
        if interval is None:
            interval = self.default_retry_delay

        # check if the task group is ready, and if so apply the callback.
        callback = maybe_signature(callback, app)
        deps = GroupResult(
            group_id,
            [result_from_tuple(r, app=app) for r in result],
            app=app,
        )
        j = deps.join_native if deps.supports_native_join else deps.join

        try:
            ready = deps.ready()
        except Exception as exc:
            raise self.retry(
                exc=exc, countdown=interval, max_retries=max_retries)
        else:
            if not ready:
                raise self.retry(countdown=interval, max_retries=max_retries)

        callback = maybe_signature(callback, app=app)
        try:
            with allow_join_result():
                ret = j(timeout=3.0, propagate=True)
        except Exception as exc:
            try:
                culprit = next(deps._failed_join_report())
                reason = 'Dependency {0.id} raised {1!r}'.format(
                    culprit, exc,
                )
            except StopIteration:
                reason = repr(exc)
            logger.error('Chord %r raised: %r', group_id, exc, exc_info=1)
            app.backend.chord_error_from_stack(callback,
                                               ChordError(reason))
        else:
            try:
                callback.delay(ret)
            except Exception as exc:
                logger.error('Chord %r raised: %r', group_id, exc, exc_info=1)
                app.backend.chord_error_from_stack(
                    callback,
                    exc=ChordError('Callback error: {0!r}'.format(exc)),
                )
    return unlock_chord


# set the default Django settings module for the 'celery' program.
os.environ.setdefault('DJANGO_SETTINGS_MODULE',
                      'mmw.settings.production')

app = Celery('mmw')

# Using a string here means the worker will not have to
# pickle the object when using Windows.
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

rollbar_settings = getattr(settings, 'ROLLBAR', {})
if rollbar_settings:
    rollbar.init(rollbar_settings.get('access_token'),
                 rollbar_settings.get('environment'))


@task_failure.connect
def handle_task_failure(**kw):
    if rollbar_settings:
        rollbar.report_exc_info(extra_data=kw)


@app.task(bind=True)
def debug_task(self):
    print('Request: {0!r}'.format(self.request))
