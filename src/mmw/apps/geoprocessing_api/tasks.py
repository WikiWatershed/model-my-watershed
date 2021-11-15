# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import logging
from urllib.parse import urlencode

from ast import literal_eval as make_tuple
from calendar import month_name

from celery import shared_task

import requests

from django.conf import settings

from mmw.settings import layer_classmaps

from apps.modeling.geoprocessing import multi, parse
from apps.modeling.tr55.utils import aoi_resolution

from apps.modeling.tasks import run_gwlfe

from apps.modeling.mapshed.tasks import (NOCACHE,
                                         collect_data,
                                         convert_data,
                                         nlcd_streams,
                                         )

from apps.geoprocessing_api.calcs import (animal_population,
                                          point_source_pollution,
                                          catchment_water_quality,
                                          stream_data,
                                          streams_for_huc12s,
                                          huc12s_with_aois,
                                          drexel_fast_zonal,
                                          )

logger = logging.getLogger(__name__)

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')

ACRES_PER_SQM = 0.000247105
CM_PER_MM = 0.1
M_PER_CM = 0.01


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
def analyze_streams(results, area_of_interest, datasource='nhdhr'):
    """
    Given geoprocessing results with stream data and an area of interest,
    returns the streams and stream order within it.
    """
    return {'survey': stream_data(results, area_of_interest, datasource)}


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
def analyze_nlcd(result, area_of_interest=None, nlcd_year='2011_2011'):
    if 'error' in result:
        raise Exception('[analyze_nlcd_{}] {}'.format(
            nlcd_year, result['error']))

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    result = parse(result)
    histogram = {}
    total_ara = 0
    total_count = 0
    categories = []

    def area(dictionary, key, default=0):
        return dictionary.get(key, default) * pixel_width * pixel_width

    # Convert results to histogram, calculate total
    for key, count in result.iteritems():
        nlcd, ara = key
        total_count += count
        total_ara += count if ara == 1 else 0
        histogram[nlcd] = count + histogram.get(nlcd, 0)

    has_ara = total_ara > 0

    for nlcd, (code, name) in layer_classmaps.NLCD.iteritems():
        categories.append({
            'area': area(histogram, nlcd),
            'active_river_area': area(result, (nlcd, 1)) if has_ara else None,
            'code': code,
            'coverage': float(histogram.get(nlcd, 0)) / total_count,
            'nlcd': nlcd,
            'type': name,
        })

    return {
        'survey': {
            'name': 'land_{}'.format(nlcd_year),
            'displayName':
                'Land Use/Cover {} (NLCD{})'.format(
                    nlcd_year[5:], nlcd_year[2:4]),
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

    for soil, (code, name) in layer_classmaps.SOIL.iteritems():
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
def analyze_climate(result, wkaoi):
    """
    Given the result of multigeoprocessing call for climate rasters,
    combines them so that the 'ppt' values are grouped together and
    'tmean' together. Each group is a dictionary where the keys are strings
    of the month '1', '2', ..., '12', and the values the average in the
    area of interest.

    Then, transforms these dictionaries into a final result of the format used
    for all other Analyze operations. The 'categories' contain twelve objects,
    one for each month, with a 'month' field containing the name of the month,
    and 'ppt' and 'tmean' fields with corresponding values. The 'index' can be
    used for sorting purposes on the client side.
    """
    if 'error' in result:
        raise Exception('[analyze_climate] {}'.format(result['error']))

    ppt = {k[5:]: v['List(0)']
           for k, v in result[wkaoi].items() if 'ppt' in k}
    tmean = {k[7:]: v['List(0)']
             for k, v in result[wkaoi].items() if 'tmean' in k}

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


@shared_task
def analyze_terrain(result):
    """
    Given a geoprocessing result in the shape of:

        [
          {
            "avg": 2503.116786250801,
            "max": 10501.0,
            "min": -84.0
          },
          {
            "avg": 2.708598957407307,
            "max": 44.52286911010742,
            "min": 0.0
          }
        ]

    Assumes the first result is for Elevation in cm and the second for Slope
    in %, and transforms it into a dictionary of the shape:

        [
          {
            "elevation": 25.03116786250801,
            "slope": 2.708598957407307,
            "type": "average"
          },
          {
            "elevation": -0.84,
            "slope": 0.0,
            "type": "minimum"
          },
          {
            "elevation": 105.01,
            "slope": 44.52286911010742,
            "type": "maximum"
          }
        ]

    which has Elevation in m and keeps Slope in %.
    """
    if 'error' in result:
        raise Exception('[analyze_terrain] {}'.format(result['error']))

    [elevation, slope] = result

    def cm_to_m(x):
        return x * M_PER_CM if x else None

    categories = [
        dict(type='average',
             elevation=cm_to_m(elevation['avg']),
             slope=slope['avg']),
        dict(type='minimum',
             elevation=cm_to_m(elevation['min']),
             slope=slope['min']),
        dict(type='maximum',
             elevation=cm_to_m(elevation['max']),
             slope=slope['max'])
    ]

    return {
        'survey': {
            'name': 'terrain',
            'displayName': 'Terrain',
            'categories': categories
        }
    }


@shared_task
def analyze_protected_lands(result, area_of_interest=None):
    if 'error' in result:
        raise Exception('[analyze_protected_lands] {}'.format(result['error']))

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    result = parse(result)
    histogram = {}
    total_count = 0
    categories = []

    for key, count in result.iteritems():
        total_count += count
        histogram[key] = count + histogram.get(key, 0)

    for class_id, (code, name) in layer_classmaps.PROTECTED_LANDS.iteritems():
        categories.append({
            'area': histogram.get(class_id, 0) * pixel_width * pixel_width,
            'class_id': class_id,
            'code': code,
            'coverage': float(histogram.get(class_id, 0)) / total_count,
            'type': name,
        })

    return {
        'survey': {
            'name': 'protected_lands',
            'displayName': 'Protected Lands',
            'categories': categories,
        }
    }


@shared_task
def analyze_drb_2100_land(area_of_interest, key):
    result = drexel_fast_zonal(area_of_interest, key)
    histogram = {}
    total_count = 0
    categories = []

    for nlcd, count in result.iteritems():
        total_count += count
        histogram[nlcd] = count + histogram.get(nlcd, 0)

    for nlcd, (code, name) in layer_classmaps.NLCD.iteritems():
        categories.append({
            'area': histogram.get(nlcd, 0),
            'code': code,
            'coverage': float(histogram.get(nlcd, 0)) / total_count,
            'nlcd': nlcd,
            'type': name,
        })

    return {
        'survey': {
            'name': 'drb_2100_land_{}'.format(key),
            'displayName': 'DRB 2100 land forecast ({})'.format(key),
            'categories': categories,
        }
    }


def collect_nlcd(histogram, geojson=None):
    """
    Convert raw NLCD geoprocessing result to area dictionary
    """
    pixel_width = aoi_resolution(geojson) if geojson else 1

    categories = [{
        'area': histogram.get(nlcd, 0) * pixel_width * pixel_width,
        'code': code,
        'nlcd': nlcd,
        'type': name,
    } for nlcd, (code, name) in layer_classmaps.NLCD.iteritems()]

    return {'categories': categories}


@shared_task
def collect_worksheet_aois(result, shapes):
    """
    Given a geoprocessing result of NLCD and NLCD+Streams for every
    area of interest within every HUC-12, processes the raw results
    and returns a dictionary a area of interest IDs corresponding to
    their processed results.
    """
    if 'error' in result:
        raise Exception('[collect_worksheet_aois] {}'
                        .format(result['error']))

    NULL_RESULT = {'nlcd_streams': {}, 'nlcd': {}}
    collection = {}

    for shape in shapes:
        output = result.get(shape['id'], NULL_RESULT)
        nlcd = collect_nlcd(parse(output['nlcd']),
                            shape['shape'])
        streams = stream_data(nlcd_streams(output['nlcd_streams']),
                              shape['shape'])
        collection[shape['id']] = {'nlcd': nlcd, 'streams': streams}

    return collection


@shared_task
def collect_worksheet_wkaois(result, shapes):
    """
    Given a geoprocessing result of MapShed and a list of HUC-12s, processes
    the raw results through GWLFE and returns a dictionary of WKAOIs to the
    modeled results, and also the processed NLCD and NLCD+Streams.
    """
    if 'error' in result:
        raise Exception('[collect_worksheet_wkaois] {}'
                        .format(result['error']))

    collection = {}

    for shape in shapes:
        wkaoi = shape['id']
        geojson = shape['shape']

        converted = convert_data(result, wkaoi)

        histogram = converted[0]['n_count']

        collected = collect_data(converted, geojson)
        modeled = run_gwlfe(collected, None, None)

        collection[wkaoi] = {
            'mapshed': collected,
            'gwlfe': modeled,
            'nlcd': collect_nlcd(histogram, geojson),
            'streams': stream_data(nlcd_streams(result[wkaoi]['nlcd_streams']),
                                   geojson)
        }

    return collection


@shared_task(time_limit=300)
def collect_worksheet(area_of_interest):
    """
    Given an area of interest, matches it to HUC-12s and generates a dictionary
    containing land and stream analysis for the matched AoIs, land and stream
    analysis for the matched HUC-12s, and GWLF-E results for the HUC-12s.

    This dictionary can be POSTed to /export/worksheet to generate an Excel
    worksheet containing these values, which can be used for further modeling.
    """
    def to_aoi_id(m):
        return '{}-{}'.format(NOCACHE, m['wkaoi'])

    matches = huc12s_with_aois(area_of_interest)

    huc12_ids = [m['huc12'] for m in matches]
    streams = streams_for_huc12s(huc12_ids)

    aoi_shapes = [{
        'id': to_aoi_id(m),
        'shape': m['aoi_geom'],
    } for m in matches]
    aoi_results = collect_worksheet_aois(
        multi('worksheet_aoi', aoi_shapes, streams),
        aoi_shapes)

    wkaoi_shapes = [{
        'id': m['wkaoi'],
        'shape': m['huc12_geom']
    } for m in matches]
    wkaoi_results = collect_worksheet_wkaois(
        multi('mapshed', wkaoi_shapes, streams),
        wkaoi_shapes)

    collection = {}

    for m in matches:
        filename = '{}__{}'.format(m['huc12'], m['name'].replace(' ', '_'))
        collection[filename] = {
            'name': m['name'],
            'aoi': aoi_results.get(to_aoi_id(m), {}),
            'huc12': wkaoi_results.get(m['wkaoi'], {}),
            'geojson': m['aoi_geom'],
        }

    return collection
