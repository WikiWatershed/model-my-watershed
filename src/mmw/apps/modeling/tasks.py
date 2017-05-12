# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import logging
import json

from ast import literal_eval as make_tuple

from StringIO import StringIO

import requests

from celery import shared_task

from django.conf import settings

from apps.modeling.calcs import (animal_population,
                                 point_source_pollution,
                                 catchment_water_quality,
                                 )

from apps.modeling.geoprocessing import to_one_ring_multipolygon

from apps.modeling.tr55.utils import (aoi_resolution,
                                      precipitation,
                                      apply_modifications_to_census,
                                      )

from tr55.model import simulate_day
from gwlfe import gwlfe, parser

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54
ACRES_PER_SQM = 0.000247105

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')


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


def format_quality(model_output):
    measures = ['Total Suspended Solids',
                'Total Nitrogen',
                'Total Phosphorus']
    codes = ['tss', 'tn', 'tp']

    quality = {}
    for key in model_output:
        def map_and_convert_units(input):
            measure, code = input
            return {
                'measure': measure,
                'load': model_output[key][code] * KG_PER_POUND,
                'runoff': model_output[key]['runoff']  # Already CM
            }

        quality[key] = map(map_and_convert_units, zip(measures, codes))

    return quality


def format_runoff(model_output):
    """
    Convert model output values that are in inches into centimeters.
    """
    inch_keys = ['runoff', 'inf', 'et']
    for key in model_output:
        for item in inch_keys:
            model_output[key][item] = model_output[key][item] * CM_PER_INCH

        distribution = model_output[key]['distribution']
        for k in distribution:
            for item in inch_keys:
                model_output[key]['distribution'][k][item] = \
                    model_output[key]['distribution'][k][item] * CM_PER_INCH

    return model_output


@shared_task
def run_tr55(censuses, model_input, cached_aoi_census=None):
    """
    A Celery wrapper around our TR55 implementation.
    censuses is either output from previous tasks in the job
    chain or are provided directly (in the case where the AoI
    census and modification censuses are cached).
    If cached_aoi_census is provided, censuses will only contain
    the modification_censuses, which were generated in the
    previous task. If cached_aoi_census isn't provided, the AoI
    census will be the first census in censuses, and everything
    else is a modification census.
    """

    # Get precipitation and cell resolution
    precip = precipitation(model_input)

    # Normalize AOI to handle single-ring multipolygon
    # inputs sent from RWD as well as shapes sent from the front-end
    aoi = to_one_ring_multipolygon(model_input.get('area_of_interest'))

    width = aoi_resolution(aoi)
    resolution = width * width

    if precip is None:
        raise Exception('No precipitation value defined')

    # Modification/BMP fragments and their censuses
    # The original modifications are not POSTed. We only
    # send the altered modifications/modification pieces.
    modification_pieces = model_input.get('modification_pieces')
    modification_censuses = (censuses[1:] if cached_aoi_census is None
                             else censuses[0:])

    # Calculate total areas for each type modification
    area_sums = {}
    for piece in modification_pieces:
        kinds = piece['value']
        area = piece['area']

        if 'bmp' in kinds:
            kind = kinds['bmp']
        else:
            kind = kinds['reclass']

        if kind in area_sums:
            area_sums[kind] += area
        else:
            area_sums[kind] = area

    # The area of interest census
    aoi_census = cached_aoi_census if cached_aoi_census else censuses[0]

    if modification_pieces and not modification_censuses:
        raise Exception('Missing censuses for modifications')
    elif modification_censuses and not modification_pieces:
        modification_censuses = []

    modifications = apply_modifications_to_census(modification_pieces,
                                                  modification_censuses)
    aoi_census['modifications'] = modifications
    aoi_census['BMPs'] = area_sums

    # Run the model under both current conditions and Pre-Columbian
    # conditions.
    try:
        model_output = simulate_day(aoi_census, precip,
                                    cell_res=resolution)

        precolumbian_output = simulate_day(aoi_census,
                                           precip,
                                           cell_res=resolution,
                                           precolumbian=True)

        model_output['pc_unmodified'] = precolumbian_output['unmodified']
        model_output['pc_modified'] = precolumbian_output['modified']
        runoff = format_runoff(model_output)
        quality = format_quality(model_output)

    except KeyError as e:
        runoff = {}
        quality = []
        logger.error('Bad input data to TR55: %s' % e)

    # Modifications were added to aoi_census for TR-55, but we do
    # not want to persist it since we have it stored seperately
    # and it may cause problems when sharing the aoi_census
    # for other model runs and scenarios.
    aoi_census.pop('modifications', None)

    # Return all results
    return {
        'inputmod_hash': model_input['inputmod_hash'],
        'modification_hash': model_input['modification_hash'],
        'aoi_census': aoi_census,
        'modification_censuses': modification_censuses,
        'runoff': runoff,
        'quality': quality
    }


@shared_task
def run_gwlfe(model_input, inputmod_hash):
    """
    Given a model_input resulting from a MapShed run, converts that dictionary
    to an intermediate GMS file representation, which is then parsed by GWLF-E
    to create the final data model z. We run GWLF-E on this final data model
    and return the results.

    This intermediate GMS file representation needs to be created because most
    of GWLF-E logic is written to handle GMS files, and to support dictionaries
    directly we would have to replicate all that logic. Thus, it is easier to
    simply create a GMS file and have it read that.
    """
    output = to_gms_file(model_input)

    reader = parser.GmsReader(output)
    z = reader.read()

    result = gwlfe.run(z)
    result['inputmod_hash'] = inputmod_hash

    return result


def to_gms_file(mapshed_data):
    """
    Given a dictionary of MapShed data, uses GWLF-E to convert it to a GMS file
    """
    mapshed_areas = [round(a, 1) for a in mapshed_data['Area']]
    mapshed_data['Area'] = mapshed_areas

    pre_z = parser.DataModel(mapshed_data)
    output = StringIO()
    writer = parser.GmsWriter(output)
    writer.write(pre_z)

    output.seek(0)

    return output


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
def nlcd_soil_census(result):
    if 'error' in result:
        raise Exception('[nlcd_soil_census] {}'.format(result['error']))

    dist = {}
    total_count = 0

    for key, count in result.iteritems():
        # Extract (3, 4) from "List(3,4)"
        (n, s) = make_tuple(key[4:])
        # Only count those values for which we have mappings
        if n in settings.NLCD_MAPPING and s in settings.SOIL_MAPPING:
            total_count += count
            # Map [NODATA, ad, bd] to c, [cd] to d
            s2 = 3 if s in [settings.NODATA, 5, 6] else 4 if s == 7 else s
            label = '{soil}:{nlcd}'.format(soil=settings.SOIL_MAPPING[s2][0],
                                           nlcd=settings.NLCD_MAPPING[n][0])
            dist[label] = {'cell_count': (
                count + (dist[label]['cell_count'] if label in dist else 0)
            )}

    return [{
        'cell_count': total_count,
        'distribution': dist,
    }]
