# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import logging
import json

from ast import literal_eval as make_tuple

from celery import shared_task

import requests

from django.conf import settings

from apps.modeling.tr55.utils import aoi_resolution

from apps.geoprocessing_api.calcs import (animal_population,
                                          point_source_pollution,
                                          catchment_water_quality,
                                          )

logger = logging.getLogger(__name__)

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')

ACRES_PER_SQM = 0.000247105


@shared_task
def start_rwd_job(location, snapping, data_source):
    """
    Calls the Rapid Watershed Delineation endpoint
    that is running in the Docker container, and returns
    the response unless there is an out-of-watershed error
    which raises an exception.
    """
    location = json.loads(location)
    lat, lng = location
    end_point = 'rwd' if data_source == DRB else 'rwd-nhd'
    rwd_url = 'http://%s:%s/%s/%f/%f' % (RWD_HOST, RWD_PORT, end_point,
                                         lat, lng)

    # The Webserver defaults to enable snapping, uses 1 (true) 0 (false)
    if not snapping:
        rwd_url += '?snapping=0'

    logger.debug('rwd request: %s' % rwd_url)

    response_json = requests.get(rwd_url).json()
    if 'error' in response_json:
        raise Exception(response_json['error'])

    return response_json


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
