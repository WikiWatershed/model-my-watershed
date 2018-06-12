# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django_statsd.clients import statsd
from django.utils.timezone import now
from celery import shared_task
from apps.core.models import Job

import json
import logging


logger = logging.getLogger(__name__)


@shared_task
def save_job_error(request, exc, traceback, job_id):
    """
    A handler task attached to the Celery chain. Any exception thrown along the
    chain will trigger this task, which logs the failure to the Job row so that
    the poling client will know that the run failed.

    To see failing task in Flower, follow instructions here:
    https://github.com/WikiWatershed/model-my-watershed/pull/551#issuecomment-119333146
    """
    error_message = 'Task {0} run from job {1} raised exception: {2}\n{3}'
    logger.error(error_message.format(str(request.id), str(job_id),
                                      str(exc),
                                      str(traceback)))
    try:
        job = Job.objects.get(id=job_id)
        job.error = exc
        job.traceback = traceback
        job.delivered_at = now()
        job.status = 'failed'
        job.save()
    except Exception as e:
        logger.error('Failed to save job error status. Job will appear hung. \
                     Job Id: {0}'.format(job.id))
        logger.error('Error number: {0} - Error: {1}'
                     .format(e.errno, e.strerror))


@shared_task(bind=True)
@statsd.timer(__name__ + '.save_job_result')
def save_job_result(self, result, id, model_input):
    """
    Updates a job row in the database with final results.
    """
    job = Job.objects.get(id=id)
    job.result = json.dumps(result)
    job.delivered_at = now()
    job.uuid = self.request.id
    job.model_input = model_input
    job.status = 'complete'
    job.save()
