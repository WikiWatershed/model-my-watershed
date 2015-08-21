# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import json
import logging
import math

# TODO Remove this when stub task is deleted.
import time

from tr55.model import simulate_day
from tr55.tablelookup import lookup_ki

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54


@shared_task
def run_analyze(area_of_interest):

    # Find the width in meters of a pixel at the average lat of the shape.
    pairs = json.loads(area_of_interest)['coordinates'][0][0]
    average_lat = reduce(lambda total, p: total+p[1], pairs, 0) / len(pairs)

    # Zoom level is a hard coded value in the geoprocessing library.
    zoom = 13
    # See https://msdn.microsoft.com/en-us/library/bb259689.aspx
    pixel_width = (math.cos(average_lat * math.pi / 180) * 2 * math.pi *
                   6378137) / (256 * math.pow(2, zoom))

    time.sleep(3)

    results = [
        {
            "name": "land",
            "displayName": "Land",
            "categories": [
                {
                    "type": "Water",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Developed: Open",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Developed: Low",
                    "area": 5181,
                    "coverage": .271
                },
                {
                    "type": "Developed: Medium",
                    "area": 3344,
                    "coverage": .175
                },
                {
                    "type": "Developed: High",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Bare Soil",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Forest",
                    "area": 1804,
                    "coverage": .094
                },
                {
                    "type": "Deciduous Forest",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Evergreen Forest",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Mixed Forest",
                    "area": 1804,
                    "coverage": .094
                },
                {
                    "type": "Dwarf Scrub",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Moss",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Pasture",
                    "area": 1804,
                    "coverage": .094
                }
            ]
        },
        {
            "name": "soil",
            "displayName": "Soil",
            "categories": [
                {
                    "type": "Clay",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Silt",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Sand",
                    "area": 21,
                    "coverage": .271
                },
            ]
        }
    ]

    convert_result_areas(pixel_width, results)

    return results


@shared_task
def prepare_census(model_input):
    """
    Call geotrellis and calculate the tile data for use in the TR55 model.
    """

    # TODO actually call geotrellis with model_input
    census = {
        'cell_count': 100,
        'distribution': {
            'c:commercial': {'cell_count': 70},
            'a:deciduous_forest': {'cell_count': 30}
        },
        'modifications': [
            {
                'change': '::no_till',
                'cell_count': 1,
                'distribution': {
                    'a:deciduous_forest': {'cell_count': 1},
                }
            },
            {
                'change': 'd:rock:',
                'cell_count': 1,
                'distribution': {
                    'a:deciduous_forest': {'cell_count': 1}
                }
            }
        ],
        'modification_hash': model_input['modification_hash']
    }

    return census


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

    et_max = 0.207
    precip = _get_precip_value(model_input)

    if precip is None:
        raise Exception('No precipitation value defined')

    # TODO: These next two lines are just for
    # demonstration purposes.
    modifications = get_census_modifications(model_input)
    census['modifications'] = modifications

    model_output = simulate_day(census, precip)

    return {
        'inputmod_hash': model_input['inputmod_hash'],
        'census': census,
        'runoff': format_runoff(model_output),
        'quality': format_quality(model_output)
    }


def _get_precip_value(model_input):
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


# TODO: For demonstration purposes.
def get_census_modifications(model_input):
    """
    For each modification that was drawn, replace
    a cell of commercial with a cell of
    chaparral. This has the effect of improving
    infiltration and evapotranspiration.
    """
    multiplier = 4
    count = len(model_input['modifications'])
    modifications = []

    # Percipiation is in modifications, so even if
    # there are no modifications, there will be one element
    # for percipitation.
    if count > 1:
        modifications = [
            {
                'change': 'a:chaparral:',
                'cell_count': count * multiplier,
                'distribution': {
                    'c:commercial': {'cell_count': count * multiplier},
                }
            }
        ]

    return modifications
