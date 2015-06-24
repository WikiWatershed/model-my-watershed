# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from rest_framework.response import Response
from django.shortcuts import get_object_or_404

from django.utils.timezone import now
from celery import shared_task
from apps.core.models import Job

import json
import logging


logger = logging.getLogger(__name__)


def get_job(request, job_uuid, format=None):
    """ A generic view to get a job by id. Used
    in apps with Celery tasks"""
    # TODO consider if we should have some sort of session id check to ensure
    # you can only view your own jobs.
    job = get_object_or_404(Job, uuid=job_uuid, user=request.user)

    # TODO Should we return the error? Might leak info about the internal
    # workings that we don't want exposed.
    return Response(
        {
            'job_uuid': job.uuid,
            'status': job.status,
            'result': job.result,
            'error': job.error,
            'started': job.created_at,
            'finished': job.delivered_at,
        }
    )


@shared_task(bind=True)
def save_job_error(self, uuid, job_id):
    """
    A handler task attached to the Celery chain. Any exception thrown along the
    chain will trigger this task, which logs the failure to the Job row so that
    the poling client will know that the run failed.
    """
    result = self.app.AsyncResult(uuid)
    error_message = 'Task {0} run from job {1} raised exception: {2}\n{3}'
    logger.error(error_message.format(str(uuid), str(job_id),
                                      str(result.result),
                                      str(result.traceback)))
    try:
        job = Job.objects.get(id=job_id)
        job.error = result.result
        job.traceback = result.traceback
        job.delivered_at = now()
        job.status = 'failed'
        job.save()
    except Exception as e:
        logger.error('Failed to save job error status. Job will appear hung. \
                     Job Id: {0}'.format(job.id))
        logger.error('Error number: {0} - Error: {1}'
                     .format(e.errno, e.strerror))


@shared_task(bind=True)
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
