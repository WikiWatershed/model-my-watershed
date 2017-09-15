# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import requests
import json

from ast import literal_eval as make_tuple

from celery import shared_task
from celery.exceptions import Retry

from requests.exceptions import ConnectionError

from django_statsd.clients import statsd

from django.core.cache import cache
from django.conf import settings


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def run(self, opname, input_data, wkaoi=None, cache_key=''):
    """
    Run a geoprocessing operation.

    Given an operation name and a dictionary of input data, looks up the
    operation from the list of supported operations in settings.GEOP['json'],
    combines it with input data, and submits it to the Geoprocessing Service.

    All errors are passed along and not raised here, so that error handling can
    be attached to the final task in the chain, without needing to be attached
    to every task.

    If a well-known area of interest id is specified in wkaoi, checks to see
    if there is a cached result for that wkaoi and operation. If so, returns
    that immediately. If not, starts the geoprocessing operation, and saves the
    results to they key before passing them on.

    When using a parameterizable operation, such as 'ppt' or 'tmean', a special
    cache_key can be provided which will be used for caching instead of the
    opname, which in this case is not unique to the operation.

    :param opname: Name of operation. Must exist in settings.GEOP['json']
    :param input_data: Dictionary of values to extend base operation JSON with
    :param wkaoi: String id of well-known area of interest. "{table}__{id}"
    :param cache_key: String to use for caching instead of opname. Optional.
    :return: Dictionary containing either results if successful, error if not
    """
    if opname not in settings.GEOP['json']:
        return {
            'error': 'Unsupported operation {}'.format(opname)
        }

    if not input_data:
        return {
            'error': 'Input data cannot be empty'
        }

    key = ''

    if wkaoi and settings.GEOP['cache']:
        key = 'geop_{}__{}{}'.format(wkaoi, opname, cache_key)
        cached = cache.get(key)
        if cached:
            return cached

    data = settings.GEOP['json'][opname].copy()
    data['input'].update(input_data)

    try:
        result = geoprocess(data, self.retry)
        if key:
            cache.set(key, result, None)
        return result
    except Retry as r:
        raise r
    except Exception as x:
        return {
            'error': x.message
        }


@statsd.timer(__name__ + '.geop_run')
def geoprocess(data, retry=None):
    """
    Submit a request to the geoprocessing service. Returns its result.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']

    geop_url = 'http://{}:{}/run'.format(host, port)

    try:
        response = requests.post(geop_url,
                                 data=json.dumps(data),
                                 headers={'Content-Type': 'application/json'})
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        return response.json()['result']
    else:
        raise Exception('Geoprocessing Error.\n'
                        'Details: {}'.format(response.text))


def parse(result):
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

    :param result: Dictionary mapping strings like 'List(a,b,c)' to ints
    :return: Dictionary mapping tuples of ints to ints
    """
    return {make_tuple(key[4:]): val for key, val in result.items()}


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
