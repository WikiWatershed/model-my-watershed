# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import logging
import urllib

from ast import literal_eval as make_tuple
from calendar import month_name

from celery import shared_task

import requests

from django.conf import settings

from apps.modeling.geoprocessing import parse
from apps.modeling.tr55.utils import aoi_resolution

from apps.geoprocessing_api.calcs import (animal_population,
                                          point_source_pollution,
                                          catchment_water_quality,
                                          stream_data,
                                          )

logger = logging.getLogger(__name__)

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')

ACRES_PER_SQM = 0.000247105
CM_PER_MM = 0.1


@shared_task
def start_rwd_job(location, snapping, simplify, data_source):
    """
    Calls the Rapid Watershed Delineation endpoint
    that is running in the Docker container, and returns
    the response unless there is an out-of-watershed error
    which raises an exception.
    """
    lat, lng = location
    end_point = 'rwd' if data_source == DRB else 'rwd-nhd'
    rwd_url = 'http://%s:%s/%s/%f/%f' % (RWD_HOST, RWD_PORT, end_point,
                                         lat, lng)

    params = {}

    # The Webserver defaults to enable snapping, uses 1 (true) 0 (false)
    if not snapping:
        params['snapping'] = 0

    # RWD also defaults to simplify the shape according to a tolerance.
    # Passing it `?simplify=0` returns the unsimplified result.
    if simplify is not False:
        params['simplify'] = simplify

    query_string = urllib.urlencode(params)

    if query_string:
        rwd_url += ('?%s' % query_string)

    logger.debug('rwd request: %s' % rwd_url)

    response_json = requests.get(rwd_url).json()
    if 'error' in response_json:
        raise Exception(response_json['error'])

    return response_json


@shared_task
def analyze_streams(results, area_of_interest):
    """
    Given geoprocessing results with stream data and an area of interest,
    returns the streams and stream order within it.
    """
    return {'survey': stream_data(results, area_of_interest)}


@shared_task
def analyze_animals(area_of_interest):
    """
    Given an area of interest, returns the animal population within it.
    """
    return {'survey': animal_population(area_of_interest)}


@shared_task
def analyze_pointsource(area_of_interest):
    """
    Given an area of interest, returns point sources of pollution within it.
    """
    return {'survey': point_source_pollution(area_of_interest)}


@shared_task
def analyze_catchment_water_quality(area_of_interest):
    """
    Given an area of interest in the DRB, returns catchment water quality data
    within it.
    """
    return {'survey': catchment_water_quality(area_of_interest)}


@shared_task(throws=Exception)
def analyze_nlcd(result, area_of_interest=None):
    if 'error' in result:
        raise Exception('[analyze_nlcd] {}'.format(result['error']))

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    histogram = {}
    total_count = 0
    categories = []

    # Convert results to histogram, calculate total
    for key, count in result.iteritems():
        total_count += count
        histogram[make_tuple(key[4:])] = count  # Change {"List(1)":5} to {1:5}

    for nlcd, (code, name) in settings.NLCD_MAPPING.iteritems():
        categories.append({
            'area': histogram.get(nlcd, 0) * pixel_width * pixel_width,
            'code': code,
            'coverage': float(histogram.get(nlcd, 0)) / total_count,
            'nlcd': nlcd,
            'type': name,
        })

    return {
        'survey': {
            'name': 'land',
            'displayName': 'Land',
            'categories': categories,
        }
    }


@shared_task(throws=Exception)
def analyze_soil(result, area_of_interest=None):
    if 'error' in result:
        raise Exception('[analyze_soil] {}'.format(result['error']))

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    histogram = {}
    total_count = 0
    categories = []

    # Convert results to histogram, calculate total
    for key, count in result.iteritems():
        total_count += count
        s = make_tuple(key[4:])  # Change {"List(1)":5} to {1:5}
        s = s if s != settings.NODATA else 3  # Map NODATA to 3
        histogram[s] = count + histogram.get(s, 0)

    for soil, (code, name) in settings.SOIL_MAPPING.iteritems():
        categories.append({
            'area': histogram.get(soil, 0) * pixel_width * pixel_width,
            'code': code,
            'coverage': float(histogram.get(soil, 0)) / total_count,
            'type': name,
        })

    return {
        'survey': {
            'name': 'soil',
            'displayName': 'Soil',
            'categories': categories,
        }
    }


@shared_task(throws=Exception)
def analyze_climate(result, category, month):
    """
    Given a climate category ('ppt' or 'tmean') and a month (1 - 12), tags
    the resulting value with that category and month and returns it as a
    dictionary.
    """
    if 'error' in result:
        raise Exception('[analyze_climate_{category}_{month}] {error}'.format(
            category=category,
            month=month,
            error=result['error']
        ))

    result = parse(result)
    key = '{}__{}'.format(category, month)

    return {key: result[0]}


@shared_task
def collect_climate(results):
    """
    Given an array of dictionaries resulting from multiple analyze_climate
    calls, combines them so that the 'ppt' values are grouped together and
    'tmean' together. Each group is a dictionary where the keys are strings
    of the month '1', '2', ..., '12', and the values the average in the
    area of interest.

    Then, transforms these dictionaries into a final result of the format used
    for all other Analyze operations. The 'categories' contain twelve objects,
    one for each month, with a 'month' field containing the name of the month,
    and 'ppt' and 'tmean' fields with corresponding values. The 'index' can be
    used for sorting purposes on the client side.
    """
    ppt = {k[5:]: v for r in results for k, v in r.items() if 'ppt' in k}
    tmean = {k[7:]: v for r in results for k, v in r.items() if 'tmean' in k}

    categories = [{
        'monthidx': i,
        'month': month_name[i],
        'ppt': ppt[str(i)] * CM_PER_MM,
        'tmean': tmean[str(i)],
    } for i in xrange(1, 13)]

    return {
        'survey': {
            'name': 'climate',
            'displayName': 'Climate',
            'categories': categories
        }
    }
