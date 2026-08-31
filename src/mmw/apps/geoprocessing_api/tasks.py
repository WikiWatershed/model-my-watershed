# -*- coding: utf-8 -*-
import os
import json
import logging
from urllib.parse import urlencode

from ast import literal_eval as make_tuple
from calendar import month_name
from functools import reduce

from celery import shared_task

import requests

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry, MultiPolygon
from django.core.cache import cache

from mmw.settings import layer_classmaps

from apps.modeling.geoprocessing import multi, parse
from apps.modeling.tr55.utils import aoi_resolution

from apps.modeling.tasks import run_gwlfe

from apps.modeling.mapshed.calcs import streams
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
                                          tdx_watershed_for_point,
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

    query_string = urlencode(params)

    if query_string:
        rwd_url += ('?%s' % query_string)

    logger.debug('rwd request: %s' % rwd_url)

    response_json = requests.get(rwd_url).json()
    if 'error' in response_json:
        raise Exception(response_json['error'])

    return response_json


@shared_task
def start_global_rwd_job(location):
    """
    Delineates a watershed using the TDX Basins dataset
    """
    lat, lng = location
    watershed = tdx_watershed_for_point(location)

    return {
        'input_pt': {
            'type': 'Feature',
            'properties': {
                'Lat': lat,
                'Lon': lng,
            },
            'geometry': {
                'type': 'Point',
                'coordinates': [lng, lat],
            },
        },
        'watershed': watershed,
    }


@shared_task
def analyze_streams(results, area_of_interest, datasource='nhdhr', wkaoi=None):
    """
    Given geoprocessing results with stream data and an area of interest,
    returns the streams and stream order within it.

    If a wkaoi is specified and caching is enabled, the results will be
    cached and reused.
    """
    key = None

    if wkaoi and settings.GEOP['cache']:
        key = f'db_{wkaoi}__{datasource}__stream_data'
        cached = cache.get(key)
        if cached:
            return {'survey': cached}

    survey = stream_data(results, area_of_interest, datasource)

    if key:
        cache.set(key, survey, None)

    return {'survey': survey}


@shared_task
def analyze_animals(area_of_interest):
    """
    Given an area of interest, returns the animal population within it.
    """
    return {'survey': animal_population(area_of_interest)}


@shared_task
def analyze_pointsource(area_of_interest, datasource=None):
    """
    Given an area of interest, returns point sources of pollution within it.
    """
    return {'survey': point_source_pollution(area_of_interest, datasource)}


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
        raise Exception(f'[analyze_nlcd_{nlcd_year}] {result["error"]}')

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    result = parse(result)
    histogram = {}
    total_ara = 0
    total_count = 0
    categories = []

    def area(dictionary, key, default=0):
        return dictionary.get(key, default) * pixel_width * pixel_width

    # Convert results to histogram, calculate total
    for key, count in result.items():
        nlcd, ara = key
        total_count += count
        total_ara += count if ara == 1 else 0
        histogram[nlcd] = count + histogram.get(nlcd, 0)

    has_ara = total_ara > 0

    for nlcd, (code, name) in layer_classmaps.NLCD.items():
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
            'name': f'land_{nlcd_year}',
            'displayName':
                f'Land Use/Cover {nlcd_year[5:]} (NLCD{nlcd_year[2:4]})',
            'categories': categories,
        }
    }


@shared_task(throws=Exception)
def analyze_global_land(result, year):
    if 'error' in result:
        raise Exception(f'[analyze_global_land_{year}] {result["error"]}')

    histogram = parse(result['result'])
    pixel_size = result['pixel_size']

    # Count up all the legitimate IO LULC classes
    # This excludes NODATA which is IO LULC 0
    total_count = sum(
        [
            count
            for ioclass, count in histogram.items()
            if ioclass in layer_classmaps.IO_LULC
        ]
    )

    categories = []

    for ioclass, (code, name) in layer_classmaps.IO_LULC.items():
        categories.append(
            {
                'area': histogram.get(ioclass, 0) * pixel_size,
                'code': code,
                'coverage': float(histogram.get(ioclass, 0)) / total_count,
                'ioclass': ioclass,
                'type': name,
            }
        )

    return {
        'survey': {
            'name': f'global_land_io_{year}',
            'displayName': f'Global Land Use/Cover {year}',
            'categories': categories,
        }
    }


@shared_task(throws=Exception)
def analyze_soil(result, area_of_interest=None):
    if 'error' in result:
        raise Exception(f'[analyze_soil] {result["error"]}')

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    histogram = {}
    total_count = 0
    categories = []

    # Convert results to histogram, calculate total
    for key, count in result.items():
        total_count += count
        s = make_tuple(key[4:])  # Change {"List(1)":5} to {1:5}
        s = s if s != settings.NODATA else 3  # Map NODATA to 3
        histogram[s] = count + histogram.get(s, 0)

    for soil, (code, name) in layer_classmaps.SOIL.items():
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
        raise Exception(f'[analyze_climate] {result["error"]}')

    ppt = {k[5:]: v['List(0)']
           for k, v in result[wkaoi].items() if 'ppt' in k}
    tmean = {k[7:]: v['List(0)']
             for k, v in result[wkaoi].items() if 'tmean' in k}

    categories = [{
        'monthidx': i,
        'month': month_name[i],
        'ppt': ppt[str(i)] * CM_PER_MM,
        'tmean': tmean[str(i)],
    } for i in range(1, 13)]

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
        raise Exception(f'[analyze_terrain] {result["error"]}')

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
        raise Exception(f'[analyze_protected_lands] {result["error"]}')

    pixel_width = aoi_resolution(area_of_interest) if area_of_interest else 1

    result = parse(result)
    histogram = {}
    total_count = 0
    categories = []

    for key, count in result.items():
        total_count += count
        histogram[key] = count + histogram.get(key, 0)

    for class_id, (code, name) in layer_classmaps.PROTECTED_LANDS.items():
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

    for nlcd, count in result.items():
        total_count += count
        histogram[nlcd] = count + histogram.get(nlcd, 0)

    for nlcd, (code, name) in layer_classmaps.NLCD.items():
        categories.append({
            'area': histogram.get(nlcd, 0),
            'code': code,
            'coverage': float(histogram.get(nlcd, 0)) / total_count,
            'nlcd': nlcd,
            'type': name,
        })

    return {
        'survey': {
            'name': f'drb_2100_land_{key}',
            'displayName': f'DRB 2100 land forecast ({key})',
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
    } for nlcd, (code, name) in layer_classmaps.NLCD.items()]

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
        raise Exception(f'[collect_worksheet_aois] {result["error"]}')

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
        raise Exception(f'[collect_worksheet_wkaois] {result["error"]}')

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
        return f'{NOCACHE}-{m["wkaoi"]}'

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
        filename = f'{m["huc12"]}__{m["name"].replace(" ", "_")}'
        collection[filename] = {
            'name': m['name'],
            'aoi': aoi_results.get(to_aoi_id(m), {}),
            'huc12': wkaoi_results.get(m['wkaoi'], {}),
            'geojson': m['aoi_geom'],
        }

    return collection


@shared_task(time_limit=300)
def draw_drainage_area_point(input):
    """
    Given a JSON geometry of a point, makes a request to the Drexel / ANS
    Drainage Area API and returns the area of interest and it's corresponding
    Land Use Summary.
    """
    # Parse the input and ensure it is a valid point, raising errors

    # Send a request to the Drexel / ANS API to get the drainage area,
    # raising errors if the API cannot be reached or errors out

    # Validate the response and raise errors, if any

    # Return the valid response

    # TODO Replace this test code with actual implementation described above
    point = GEOSGeometry(json.dumps(input['geometry']))
    box = json.loads(MultiPolygon(point.buffer(0.01), srid=4326).geojson)
    area_of_interest = {
        'type': 'Feature',
        'properties': {
            'drainage_area': True,
        },
        'geometry': box,
    }

    return {
        'area_of_interest': area_of_interest,
        'point': json.loads(point.geojson),
    }


@shared_task(time_limit=300)
def draw_drainage_area_stream(input):
    # Parse the input and ensure it is a valid polygon, raising errors if not

    # Send a request to the Drexel / ANS API to get the drainage area,
    # raising errors if the API cannot be reached or errors out

    # Validate the response and raise errors, if any

    # Return the valid response

    # TODO Replace this test code with actual implementation described above
    def union(collection, line):
        return collection.union(line)

    polygon = GEOSGeometry(json.dumps(input['geometry']))

    # Ensure it intersects with a stream section, raising errors if not
    stream_lines = [GEOSGeometry(s) for s in streams(polygon.geojson)]
    if not stream_lines:
        raise Exception('No streams within given shape.')

    segment = reduce(union, stream_lines[1:], stream_lines[0])

    box = json.loads(MultiPolygon(segment.buffer(0.01), srid=4326).geojson)
    area_of_interest = {
        'type': 'Feature',
        'properties': {
            'drainage_area': True,
        },
        'geometry': box,
    }

    return {
        'area_of_interest': area_of_interest,
        'stream_segment': json.loads(segment.geojson),
    }


@shared_task
def wrap_in_survey(result):
    """
    Takes a result, and wraps it in a dict with a `survey` key

    This is used to make results compatible with /analyze/ API, which always
    wraps results in a `survey`.

    Example:

    wrap_in_survey({'a': 1, 'b': 2}) => {'survey': {'a': 1, 'b': 2}}
    """
    return {'survey': result}
