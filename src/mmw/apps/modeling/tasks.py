# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import json
import logging
import math

from apps.modeling.geoprocessing import geojson_to_survey, \
    geojson_to_census, geojson_to_censuses

from tr55.model import simulate_day

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54


def aoi_resolution(area_of_interest):
    # Find the width in meters of a pixel at the average lat of the shape.
    pairs = area_of_interest['coordinates'][0][0]
    average_lat = reduce(lambda total, p: total+p[1], pairs, 0) / len(pairs)

    # Zoom level is a hard coded value in the geoprocessing library.
    # TMS zoom levels are relative to tiles, not pixels.  The dataset
    # that we are using on S3 has tiles of size 768x768 (instead of
    # the more typical 256x256) and is at zoom level 11.  This
    # corresponds roughly to zoom level 13 with 256x256 tiles.
    zoom = 11
    tile_width = 768
    # See https://msdn.microsoft.com/en-us/library/bb259689.aspx
    return (math.cos(average_lat * math.pi / 180) * 2 * math.pi *
            6378137) / (tile_width * math.pow(2, zoom))


@shared_task
def run_analyze(area_of_interest):
    pixel_width = aoi_resolution(json.loads(area_of_interest))
    results = geojson_to_survey(area_of_interest)
    convert_result_areas(pixel_width, results)
    return results


@shared_task
def prepare_census(model_input):
    """
    Call geotrellis and calculate the tile data for use in the TR55 model.
    """
    if 'area_of_interest' in model_input:
        return geojson_to_census(model_input['area_of_interest'])
    else:
        raise Exception('No Area of Interest')


def format_quality(model_output):
    measures = ['Biochemical Oxygen Demand',
                'Total Suspended Solids',
                'Total Nitrogen',
                'Total Phosphorus']
    codes = ['bod', 'tss', 'tn', 'tp']

    def fn(input):
        measure, code = input
        return {
            'measure': measure,
            'load': model_output['modified'][code] * KG_PER_POUND
        }

    return map(fn, zip(measures, codes))


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
def run_tr55(census, model_input):
    """
    A thin Celery wrapper around our TR55 implementation.
    """
    precip = get_precip(model_input)
    width = aoi_resolution(model_input['area_of_interest'])
    res = width * width

    if precip is None:
        raise Exception('No precipitation value defined')

    modifications = get_census_modifications(model_input)
    census['modifications'] = modifications

    model_output = simulate_day(census, precip, cell_res=res)
    precolumbian_output = simulate_day(census, precip,
                                       cell_res=res, precolumbian=True)
    model_output['pc_unmodified'] = precolumbian_output['unmodified']
    model_output['pc_modified'] = precolumbian_output['modified']

    return {
        'inputmod_hash': model_input['inputmod_hash'],
        'census': census,
        'runoff': format_runoff(model_output),
        'quality': format_quality(model_output)
    }


def get_precip(model_input):
    try:
        precips = [item for item in model_input['inputs']
                   if item['name'] == 'precipitation']
        return precips[0]['value']
    except Exception:
        return None


def convert_result_areas(pixel_width, results):
    """
    Updates area values on the survey results. The survey gives area as a
    number of pixels in a geotiff. This converts the area to square meters.
    """
    for i in range(len(results)):
        categories = results[i]['categories']
        for j in range(len(categories)):
            categories[j]['area'] = (categories[j]['area'] * pixel_width *
                                     pixel_width)


def get_census_modifications(model_input):
    def change_key(modification):
        name = modification['name']
        value = modification['value']

        if name == 'landcover':
            return {'change': ':%s:' % value}
        elif name == 'conservation_practice':
            return {'change': '::%s' % value}
        elif name == 'both':
            return {'change': ':%s:%s' % (value['reclass'], value['bmp'])}

    if 'modification_pieces' in model_input:
        raw_mods = model_input['modification_pieces']
    else:
        raw_mods = []

    changes = [change_key(m) for m in raw_mods]

    polygons = [m['shape']['geometry'] for m in raw_mods]
    modifications = geojson_to_censuses(polygons)

    for (m, c) in zip(modifications, changes):
        m.update(c)

    return modifications
