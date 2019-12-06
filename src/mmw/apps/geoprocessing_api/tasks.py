# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import json
import logging
import urllib

from ast import literal_eval as make_tuple
from calendar import month_name

from celery import shared_task

import requests

from django.conf import settings
from django.utils.timezone import now

from apps.modeling.geoprocessing import parse
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
                                          )

logger = logging.getLogger(__name__)

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')

ACRES_PER_SQM = 0.000247105
CM_PER_MM = 0.1
M_PER_CM = 0.01
SQKM_PER_SQM = 1.0E-06


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

    result = parse(result)
    histogram = {}
    total_count = 0
    categories = []

    # Convert results to histogram, calculate total
    for (nlcd, ara), count in result.iteritems():
        total_count += count
        histogram[nlcd] = count + histogram.get(nlcd, 0)

    for nlcd, (code, name) in settings.NLCD_MAPPING.iteritems():
        categories.append({
            'area': histogram.get(nlcd, 0) * pixel_width * pixel_width,
            'active_river_area':
                result.get((nlcd, 1), 0) * pixel_width * pixel_width,
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
    } for nlcd, (code, name) in settings.NLCD_MAPPING.iteritems()]

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
        result['error'] = '[collect_worksheet_aois] {}'.format(
            result['error'])
        return result

    NULL_RESULT = {'nlcd_streams': {}, 'nlcd': {}}
    collection = {}

    for shape in shapes:
        output = result.get(shape['wkaoi'], NULL_RESULT)
        nlcd = collect_nlcd(parse(output['nlcd']),
                            shape['geom'])
        streams = stream_data(nlcd_streams(output['nlcd_streams']),
                              shape['geom'])
        collection[shape['wkaoi']] = {'nlcd': nlcd, 'streams': streams}

    return collection


@shared_task
def collect_worksheet_wkaois(result, shapes):
    """
    Given a geoprocessing result of MapShed and a list of HUC-12s, processes
    the raw results through GWLFE and returns a dictionary of WKAOIs to the
    modeled results, and also the processed NLCD and NLCD+Streams.
    """
    if 'error' in result:
        result['error'] = '[collect_worksheet_wkaois] {}'.format(
            result['error'])
        return result

    collection = {}

    for shape in shapes:
        wkaoi = shape['wkaoi']
        geojson = shape['geom']

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


@shared_task
def collect_worksheet(results, filenames):
    """
    Given a list of results for areas of interest, and another list of results
    for HUC-12s, rearranges them to be grouped by the filename and returns this
    new arrangement.
    """
    for result in results:
        if 'error' in result:
            raise Exception('[collect_worksheet] {}'
                            .format(result['error']))

    collection = {}

    for f in filenames:
        collection[f['filename']] = {
            'name': f['name'],
            'aoi': results[0].get('{}-{}'.format(NOCACHE, f['wkaoi']), {}),
            'huc12': results[1].get(f['wkaoi'], {}),
            'geojson': f['aoi'],
        }

    return collection


@shared_task
def transform_worksheet(results):
    """
    Given a dictionary of results for areas of interest and HUC-12s, indexed
    by the filename, transforms the results into a payload for generating
    an Excel worksheet, which can be fed to the /export/worksheet endpoint.
    """
    payload = []

    for k, v in results.iteritems():
        huc12_stream_length_km = sum(
            [c['lengthkm'] for c in v['huc12']['streams']['categories']])
        huc12_stream_ag_pct = \
            v['huc12']['streams']['categories'][0]['ag_stream_pct']
        huc12_stream_ag_length_km = \
            huc12_stream_length_km * huc12_stream_ag_pct
        huc12_stream_urb_length_km = \
            huc12_stream_length_km - huc12_stream_ag_length_km

        huc12_nlcd = {c['nlcd']: (c['area'] / 1.00000E+06)
                      for c in v['huc12']['nlcd']['categories']}

        aoi_stream_length_km = sum(
            [c['lengthkm'] for c in v['aoi']['streams']['categories']])
        aoi_stream_ag_pct = \
            v['aoi']['streams']['categories'][0]['ag_stream_pct']
        aoi_stream_ag_length_km = \
            aoi_stream_length_km * aoi_stream_ag_pct
        aoi_stream_urb_length_km = \
            aoi_stream_length_km - aoi_stream_ag_length_km

        date = now()

        spec = {
            'C11': date.strftime('%Y-%m-%d'),  # Date Data Entered
            'C13': v['name'],  # Watershed
            'C14': date.strftime('%Y'),  # Year
            'L18': round(huc12_stream_length_km, 2),  # Total Length # NOQA
            'L19': round(huc12_stream_ag_length_km, 2),  # Ag Streams # NOQA
            'L20': round(huc12_stream_urb_length_km, 2),  # Non-Ag Streams # NOQA
            'L27': round(v['huc12']['mapshed']['NumAnimals'][2], 2),  # Chickens, Broilers # NOQA
            'L28': round(v['huc12']['mapshed']['NumAnimals'][3], 2),  # Chickens, Layers # NOQA
            'L29': round(v['huc12']['mapshed']['NumAnimals'][1], 2),  # Cows, Beef # NOQA
            'L30': round(v['huc12']['mapshed']['NumAnimals'][0], 2),  # Cows, Dairy # NOQA
            'L31': round(v['huc12']['mapshed']['NumAnimals'][6], 2),  # Horses # NOQA
            'L32': round(v['huc12']['mapshed']['NumAnimals'][4], 2),  # Pigs/Hogs/Swine # NOQA
            'L33': round(v['huc12']['mapshed']['NumAnimals'][5], 2),  # Sheep # NOQA
            'L34': round(v['huc12']['mapshed']['NumAnimals'][7], 2),  # Turkeys # NOQA
            'D48': round(huc12_nlcd.get(11, 0), 2),  # Open Water # NOQA
            'D49': round(huc12_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
            'D50': round(huc12_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
            'D51': round(huc12_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
            'D52': round(huc12_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
            'D53': round(huc12_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
            'D54': round(huc12_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
            'D55': round(huc12_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
            'D56': round(huc12_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
            'D57': round(huc12_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
            'D58': round(huc12_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
            'D59': round(huc12_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
            'D60': round(huc12_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
            'D61': round(huc12_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
            'D62': round(huc12_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
            'D63': round(huc12_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            'K48': round(v['huc12']['gwlfe']['Loads'][0]['Sediment'], 2),  # Hay/Pasture # NOQA
            'K49': round(v['huc12']['gwlfe']['Loads'][1]['Sediment'], 2),  # Cropland # NOQA
            'K50': round(v['huc12']['gwlfe']['Loads'][2]['Sediment'], 2),  # Wooded Areas # NOQA
            'K51': round(v['huc12']['gwlfe']['Loads'][3]['Sediment'], 2),  # Wetlands # NOQA
            'K52': round(v['huc12']['gwlfe']['Loads'][4]['Sediment'], 2),  # Open Land # NOQA
            'K53': round(v['huc12']['gwlfe']['Loads'][5]['Sediment'], 2),  # Barren Areas # NOQA
            'K54': round(v['huc12']['gwlfe']['Loads'][6]['Sediment'], 2),  # Low-Density Mixed # NOQA
            'K55': round(v['huc12']['gwlfe']['Loads'][7]['Sediment'], 2),  # Medium-Density Mixed # NOQA
            'K56': round(v['huc12']['gwlfe']['Loads'][8]['Sediment'], 2),  # High-Density Mixed # NOQA
            'K57': round(v['huc12']['gwlfe']['Loads'][9]['Sediment'], 2),  # Other Upland Areas # NOQA
            'K58': round(v['huc12']['gwlfe']['Loads'][10]['Sediment'], 2),  # Farm Animals # NOQA
            'K59': round(v['huc12']['gwlfe']['Loads'][11]['Sediment'], 2),  # Stream Bank Erosion # NOQA
            'K60': round(v['huc12']['gwlfe']['Loads'][12]['Sediment'], 2),  # Subsurface Flow # NOQA
            'K61': round(v['huc12']['gwlfe']['Loads'][13]['Sediment'], 2),  # Point Sources # NOQA
            'K62': round(v['huc12']['gwlfe']['Loads'][14]['Sediment'], 2),  # Septic Systems # NOQA
            'L48': round(v['huc12']['gwlfe']['Loads'][0]['TotalN'], 2),  # Hay/Pasture # NOQA
            'L49': round(v['huc12']['gwlfe']['Loads'][1]['TotalN'], 2),  # Cropland # NOQA
            'L50': round(v['huc12']['gwlfe']['Loads'][2]['TotalN'], 2),  # Wooded Areas # NOQA
            'L51': round(v['huc12']['gwlfe']['Loads'][3]['TotalN'], 2),  # Wetlands # NOQA
            'L52': round(v['huc12']['gwlfe']['Loads'][4]['TotalN'], 2),  # Open Land # NOQA
            'L53': round(v['huc12']['gwlfe']['Loads'][5]['TotalN'], 2),  # Barren Areas # NOQA
            'L54': round(v['huc12']['gwlfe']['Loads'][6]['TotalN'], 2),  # Low-Density Mixed # NOQA
            'L55': round(v['huc12']['gwlfe']['Loads'][7]['TotalN'], 2),  # Medium-Density Mixed # NOQA
            'L56': round(v['huc12']['gwlfe']['Loads'][8]['TotalN'], 2),  # High-Density Mixed # NOQA
            'L57': round(v['huc12']['gwlfe']['Loads'][9]['TotalN'], 2),  # Other Upland Areas # NOQA
            'L58': round(v['huc12']['gwlfe']['Loads'][10]['TotalN'], 2),  # Farm Animals # NOQA
            'L59': round(v['huc12']['gwlfe']['Loads'][11]['TotalN'], 2),  # Stream Bank Erosion # NOQA
            'L60': round(v['huc12']['gwlfe']['Loads'][12]['TotalN'], 2),  # Subsurface Flow # NOQA
            'L61': round(v['huc12']['gwlfe']['Loads'][13]['TotalN'], 2),  # Point Sources # NOQA
            'L62': round(v['huc12']['gwlfe']['Loads'][14]['TotalN'], 2),  # Septic Systems # NOQA
            'M48': round(v['huc12']['gwlfe']['Loads'][0]['TotalP'], 2),  # Hay/Pasture # NOQA
            'M49': round(v['huc12']['gwlfe']['Loads'][1]['TotalP'], 2),  # Cropland # NOQA
            'M50': round(v['huc12']['gwlfe']['Loads'][2]['TotalP'], 2),  # Wooded Areas # NOQA
            'M51': round(v['huc12']['gwlfe']['Loads'][3]['TotalP'], 2),  # Wetlands # NOQA
            'M52': round(v['huc12']['gwlfe']['Loads'][4]['TotalP'], 2),  # Open Land # NOQA
            'M53': round(v['huc12']['gwlfe']['Loads'][5]['TotalP'], 2),  # Barren Areas # NOQA
            'M54': round(v['huc12']['gwlfe']['Loads'][6]['TotalP'], 2),  # Low-Density Mixed # NOQA
            'M55': round(v['huc12']['gwlfe']['Loads'][7]['TotalP'], 2),  # Medium-Density Mixed # NOQA
            'M56': round(v['huc12']['gwlfe']['Loads'][8]['TotalP'], 2),  # High-Density Mixed # NOQA
            'M57': round(v['huc12']['gwlfe']['Loads'][9]['TotalP'], 2),  # Other Upland Areas # NOQA
            'M58': round(v['huc12']['gwlfe']['Loads'][10]['TotalP'], 2),  # Farm Animals # NOQA
            'M59': round(v['huc12']['gwlfe']['Loads'][11]['TotalP'], 2),  # Stream Bank Erosion # NOQA
            'M60': round(v['huc12']['gwlfe']['Loads'][12]['TotalP'], 2),  # Subsurface Flow # NOQA
            'M61': round(v['huc12']['gwlfe']['Loads'][13]['TotalP'], 2),  # Point Sources # NOQA
            'M62': round(v['huc12']['gwlfe']['Loads'][14]['TotalP'], 2),  # Septic Systems # NOQA
            'N79': round(aoi_stream_length_km, 2),
            'N80': round(aoi_stream_ag_length_km, 2),
            'N81': round(aoi_stream_urb_length_km, 2),
        }

        aoi_total_area = sum(
            [c['area'] for c in v['aoi']['nlcd']['categories']])

        if aoi_total_area > 2 / SQKM_PER_SQM:
            # Use SQKM block for Area of Interest
            aoi_nlcd = {c['nlcd']: (c['area'] * SQKM_PER_SQM)
                        for c in v['aoi']['nlcd']['categories']}
            spec.update({
                'D73': round(aoi_nlcd.get(11, 0), 2),  # Open Water # NOQA
                'D74': round(aoi_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
                'D75': round(aoi_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
                'D76': round(aoi_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
                'D77': round(aoi_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
                'D78': round(aoi_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
                'D79': round(aoi_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
                'D80': round(aoi_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
                'D81': round(aoi_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
                'D82': round(aoi_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
                'D83': round(aoi_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
                'D84': round(aoi_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
                'D85': round(aoi_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
                'D86': round(aoi_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
                'D87': round(aoi_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
                'D88': round(aoi_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            })
        else:
            # Use SQM block for Area of Interest
            aoi_nlcd = {c['nlcd']: (c['area'])
                        for c in v['aoi']['nlcd']['categories']}
            spec.update({
                'D94': round(aoi_nlcd.get(11, 0), 2),  # Open Water # NOQA
                'D95': round(aoi_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
                'D96': round(aoi_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
                'D97': round(aoi_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
                'D98': round(aoi_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
                'D99': round(aoi_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
                'D100': round(aoi_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
                'D101': round(aoi_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
                'D102': round(aoi_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
                'D103': round(aoi_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
                'D104': round(aoi_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
                'D105': round(aoi_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
                'D106': round(aoi_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
                'D107': round(aoi_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
                'D108': round(aoi_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
                'D109': round(aoi_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            })

        payload.append({
            'name': k,
            'geojson': json.loads(v['geojson']),
            'worksheet': {
                'MMW Output': spec
            }
        })

    return payload
