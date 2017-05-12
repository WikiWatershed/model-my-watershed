# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from ast import literal_eval as make_tuple

from django.conf import settings
from django_statsd.clients import statsd
from celery import shared_task
from celery.exceptions import MaxRetriesExceededError, Retry
from requests.exceptions import ConnectionError

import requests
import json


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def start(self, opname, input_data):
    """
    Start a geoproessing operation.

    Given an operation name and a dictionary of input data, looks up the
    operation from the list of supported operations in settings.GEOP['json'],
    combines it with input data, and submits it to Spark JobServer.

    This task must always be succeeded by `finish` below.

    All errors are passed along and not raised here, so that error handling can
    be attached to the final task in the chain, without needing to be attached
    to every task.

    :param opname: Name of operation. Must exist in settings.GEOP['json']
    :param input_data: Dictionary of values to extend base operation JSON with
    :return: Dictionary containing either job_id if successful, error if not
    """
    if opname not in settings.GEOP['json']:
        return {
            'error': 'Unsupported operation {}'.format(opname)
        }

    if not input_data:
        return {
            'error': 'Input data cannot be empty'
        }

    data = settings.GEOP['json'][opname].copy()
    data['input'].update(input_data)

    try:
        return {
            'job_id': sjs_submit(data, retry=self.retry)
        }
    except Retry as r:
        raise r
    except Exception as x:
        return {
            'error': x.message
        }


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def finish(self, incoming):
    """
    Retrieves results of geoprocessing.

    To be used immediately after the `start` task, this takes the incoming
    data and inspects it to see if there are any reported errors. If found,
    the errors are passed through to the next task. Otherwise, the incoming
    parameters are used to retrieve the job from Spark JobServer, and those
    results are returned.

    This task must always be preceeded by `start` above. The succeeding task
    must take the raw JSON values and process them into information. The JSON
    output will look like:

        {
            'List(1,2)': 3,
            'List(4,5)': 6
        }

    where the values and number of items depend on the input.

    All errors are passed along and not raised here, so that error handling can
    be attached to the final task in the chain, without needing to be attached
    to every task.

    :param incoming: Dictionary containing job_id or error
    :return: Dictionary of Spark JobServer results, or error
    """
    if 'error' in incoming:
        return incoming

    try:
        return sjs_retrieve(retry=self.retry, **incoming)
    except Retry as r:
        # Celery throws a Retry exception when self.retry is called to stop
        # the execution of any further code, and to indicate to the worker
        # that the same task is going to be retried.
        # We capture and re-raise Retry to continue this behavior, and ensure
        # that it doesn't get passed to the next task like every other error.
        raise r
    except Exception as x:
        return {
            'error': x.message
        }


@statsd.timer(__name__ + '.sjs_submit')
def sjs_submit(data, retry=None):
    """
    Submits a job to Spark Job Server. Returns its Job ID, which
    can be used with sjs_retrieve to get the final result.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']
    args = settings.GEOP['args']

    base_url = 'http://{}:{}'.format(host, port)
    jobs_url = '{}/jobs?{}'.format(base_url, args)

    try:
        response = requests.post(jobs_url, data=json.dumps(data))
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        job = response.json()
    else:
        error = response.json()

        if error['status'] == 'NO SLOTS AVAILABLE' and retry is not None:
            retry(exc=Exception('No slots available in Spark JobServer.\n'
                                'Details = {}'.format(response.text)))
        elif error['result'] == 'context geoprocessing not found':
            reboot_sjs_url = '{}/contexts?reset=reboot'.format(base_url)
            context_response = requests.put(reboot_sjs_url)

            if context_response.ok:
                if retry is not None:
                    retry(exc=Exception('Geoprocessing context missing in '
                                        'Spark JobServer\nDetails = {}'.format(
                                            context_response.text)))
                else:
                    raise Exception('Geoprocessing context missing in '
                                    'Spark JobServer, but no retry was set.\n'
                                    'Details = {}'.format(
                                        context_response.text))

            else:
                raise Exception('Unable to create missing geoprocessing '
                                'context in Spark JobServer.\n'
                                'Details = {}'.format(context_response.text))
        else:
            raise Exception('Unable to submit job to Spark JobServer.\n'
                            'Details = {}'.format(response.text))

    if job['status'] == 'STARTED':
        return job['result']['jobId']
    else:
        raise Exception('Submitted job did not start in Spark JobServer.\n'
                        'Details = {}'.format(response.text))


@statsd.timer(__name__ + '.sjs_retrieve')
def sjs_retrieve(job_id, retry=None):
    """
    Given a job ID, will try to retrieve its value. If the job is
    still running, will call the optional retry function before
    proceeding.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']

    url = 'http://{}:{}/jobs/{}'.format(host, port, job_id)
    try:
        response = requests.get(url)
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        job = response.json()
    else:
        raise Exception('Unable to retrieve job {} from Spark JobServer.\n'
                        'Details = {}'.format(job_id, response.text))

    if job['status'] == 'FINISHED':
        return job['result']
    elif job['status'] == 'RUNNING':
        if retry is not None:
            try:
                retry()
            except MaxRetriesExceededError:
                delete = requests.delete(url)  # Job took too long, terminate
                if delete.ok:
                    raise Exception('Job {} timed out, '
                                    'deleted.'.format(job_id))
                else:
                    raise Exception('Job {} timed out, unable to delete.\n'
                                    'Details: {}'.format(job_id, delete.text))
    else:
        if job['status'] == 'ERROR':
            status = 'ERROR ({}: {})'.format(job['result']['errorClass'],
                                             job['result']['message'])
        else:
            status = job['status']

        delete = requests.delete(url)  # Job in unusual state, terminate
        if delete.ok:
            raise Exception('Job {} was {}, deleted'.format(job_id, status))
        else:
            raise Exception('Job {} was {}, could not delete.\n'
                            'Details = {}'.format(job_id, status, delete.text))


def parse(sjs_result):
    """
    Converts raw JSON results from Spark JobServer to dictionary of tuples

    If the input is this:

        {
            'List(1,2)': 3,
            'List(4,5)': 6
        }

    The output will be:

        {
            (1, 2): 3,
            (4, 5): 6
        }

    :param sjs_result: Dictionary mapping strings like 'List(a,b,c)' to ints
    :return: Dictionary mapping tuples of ints to ints
    """
    return {make_tuple(key[4:]): val for key, val in sjs_result.items()}


def to_one_ring_multipolygon(area_of_interest):
    """
    Given a multipolygon comprising just a single ring structured in a
    five-dimensional array, remove one level of nesting and make the AOI's
    coordinates a four-dimensional array. Otherwise, no op.
    """

    if type(area_of_interest['coordinates'][0][0][0][0]) is list:
        multipolygon_shapes = area_of_interest['coordinates'][0]
        if len(multipolygon_shapes) > 1:
            raise Exception('Unable to parse multi-ring RWD multipolygon')
        else:
            area_of_interest['coordinates'] = multipolygon_shapes

    return area_of_interest
