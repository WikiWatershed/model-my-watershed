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

NOWKAOI = 'nowkaoi'


@shared_task(bind=True, default_retry_delay=1, max_retries=6)
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

    To be used for single operation requests. Uses the /run endpoint of the
    geoprocessing service.

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

    # If no vector data is supplied for vector operation, shortcut to empty
    if 'vector' in data['input'] and data['input']['vector'] == [None]:
        result = {}
        if key:
            cache.set(key, result, None)
        return result

    try:
        result = geoprocess('run', data, self.retry)
        if key:
            cache.set(key, result, None)
        return result
    except Retry as r:
        raise r
    except ConnectionError:
        return {
            'error': 'Could not reach the geoprocessing service'
        }
    except Exception as x:
        return {
            'error': str(x)
        }


@shared_task(bind=True, default_retry_delay=1, max_retries=6)
def multi(self, opname, shapes, stream_lines):
    """
    Perform a multi-operation geoprocessing request.

    Given an operation name, a list of shapes, and a string of MultiLine
    GeoJSON, where each item in 'shapes' is like:

        { 'id': '', shape: '' }

    where 'shape' is a stringified GeoJSON of a Polygon or MultiPolygon and
    'stream_lines' is a stringified GeoJSON of a MultiLine, combines it with
    the JSON saved in settings.GEOP.json corresponding to the opname, to make
    a payload like this:

        {
            'shapes': [],
            'streamLines': '',
            'operations': []
        }

    where each item in 'operations' is like:

        {
            'name': '',
            'label': '',
            'rasters': [],
            'targetRaster': '',
            'pixelIsArea': false
        }

    where 'rasters' is an array of strings, and 'targetRaster' and
    'pixelIsArea' are optional.

    Error handling behaves identically to `run` above, i.e. any errors are
    caught and passed along as 'error' keys so they may be handled in a task
    further down the Celery chain.

    If there is an operation with 'name' == 'RasterLinesJoin', 'streamLines'
    should not be empty. If it is empty, that operation will be skipped.

    The results will be in the format:

        {
            '{{ shape_id }}': {
                '{{ operation_label }}': {{ operation_results }},
                '{{ operation_label }}': {{ operation_results }},
                ...
            },
            ...
        }

    where `shape_id` is for each shape, and `operation_label` is for each
    operation. The `operation_results` are a dictionary with string keys and
    double values. The keys need to be parsed with the `parse` method below.

    Each `operation_results` is cached with the key:

        {{ shape_id }}__{{ operation_label }}

    Before running the geoprocessing service, we inspect the cache to see
    if all the requested operations are already cached for this shape. If so,
    we remove that shape from the payload.

    If not found in the cache, the specified operations are run for that shape
    as part of the payload. Once we have the results back, we cache them. Since
    we are using the same cache naming scheme as run, any operation cached via
    `multi` can be reused by `run`.
    """
    data = settings.GEOP['json'][opname].copy()
    data['shapes'] = []
    data['streamLines'] = stream_lines

    operation_count = len(data['operations'])
    output = {}

    # Get cached results
    for shape in shapes:
        cached_operations = 0
        if shape['id'] != NOWKAOI:
            output[shape['id']] = {}
            for op in data['operations']:
                key = 'geop_{}__{}'.format(shape['id'], op['label'])
                cached = cache.get(key)
                if cached:
                    output[shape['id']][op['label']] = cached
                    cached_operations += 1

        if cached_operations != operation_count:
            data['shapes'].append(shape)

    # If no un-cached shapes, return cached output
    if not data['shapes']:
        return output

    try:
        result = geoprocess('multi', data, self.retry)

        # Set cached results
        for shape_id, operation_results in result.iteritems():
            if shape_id != NOWKAOI:
                for op_label, value in operation_results.iteritems():
                    key = 'geop_{}__{}'.format(shape_id, op_label)
                    cache.set(key, value, None)

        output.update(result)

        return output
    except Retry as r:
        raise r
    except ConnectionError:
        return {
            'error': 'Could not reach the geoprocessing service'
        }
    except Exception as x:
        return {
            'error': str(x)
        }


@statsd.timer(__name__ + '.geop_run')
def geoprocess(endpoint, data, retry=None):
    """
    Submit a request to the specified endpoint of the geoprocessing service.
    Returns its result.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']

    geop_url = 'http://{}:{}/{}'.format(host, port, endpoint)

    try:
        response = requests.post(geop_url,
                                 data=json.dumps(data),
                                 headers={'Content-Type': 'application/json'})
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        result = response.json()
        if 'result' in result:
            return result['result']
        else:
            return result
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
