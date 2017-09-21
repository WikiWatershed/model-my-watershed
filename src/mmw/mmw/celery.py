from __future__ import absolute_import

import os
import rollbar
import logging

from celery import Celery
from celery._state import connect_on_app_finalize
from celery.signals import task_failure

from django.conf import settings


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
