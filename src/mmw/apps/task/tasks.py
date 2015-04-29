# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.utils.timezone import now
from celery import shared_task
from apps.task.models import Job

import json
import logging
import urllib2

# TODO import TR55
# from tr55.model import simulate_year

# TODO REMOVE THIS.
import time

logger = logging.getLogger(__name__)


@shared_task
def make_gt_service_call_task(model_input):
    """
    Call geotrellis and calculate the tile data for use in the TR55 model.
    """
    # TODO call the real service
    # It would be nicer to use HttpDispatchTask but there were import problems.
    # In testing we could not make it work so we will probably need to default
    # to urllib2.
    # return HttpDispatchTask(url="http://gtservice.internal/endpoint",
    #                         method="POST", input=model_input)

    # TODO remove me. For testing fetch something over the web.
    result = urllib2.urlopen('http://azavea.com')
    return result.read()


@shared_task
def run_tr55(model_input, landscape):
    """
    A thin Celery wrapper around our TR55 implementation.
    """
    print(landscape)
    # TODO Remove this.
    # hard coded values for test
    landscape = {
        'result': {
            'cell_count': 147,
            'distribution': {
                'd:hi_residential': 33,
                'c:commercial': 42,
                'a:deciduous_forest': 72
            }
        }
    }
    time.sleep(5)

    # TODO Get the real simpulation data.
    # (q, et, inf) = simulate_year(landscape)

    # TODO Dummy data. Remove me.
    q = 2
    et = 3
    inf = 4
    return {
        'q': q,
        'et': et,
        'inf': inf,
    }


@shared_task
def run_analyze(area_of_interest, landscape):
    time.sleep(3)

    results = [
        {
            "name": "land",
            "displayName": "Land",
            "categories": [
                {
                    "type": "Water",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Developed: Open",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Developed: Low",
                    "area": 5181,
                    "coverage": .271
                },
                {
                    "type": "Developed: Medium",
                    "area": 3344,
                    "coverage": .175
                },
                {
                    "type": "Developed: High",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Bare Soil",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Forest",
                    "area": 1804,
                    "coverage": .094
                }
            ]
        },
        {
            "name": "soil",
            "displayName": "Soil",
            "categories": [
                {
                    "type": "Clay",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Silt",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Sand",
                    "area": 21,
                    "coverage": .271
                },
            ]
        }
    ]

    return results


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
