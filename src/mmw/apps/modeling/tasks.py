# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import logging

# TODO Remove this when stub task is deleted.
import time

from tr55.model import simulate_modifications, simulate_cell_day
from tr55.tablelookup import lookup_ki

logger = logging.getLogger(__name__)


@shared_task
def run_analyze(area_of_interest):
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
                'bmp': 'no_till',
                'cell_count': 1,
                'distribution': {
                    'a:deciduous_forest': {'cell_count': 1},
                }
            },
            {
                'reclassification': 'd:rock',
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
            'load': model_output['modified'][code]
        }

    return map(fn, zip(measures, codes))


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

    def simulate_day(cell, cell_count):
        soil_type, land_use = cell.lower().split(':')
        et = et_max * lookup_ki(land_use)
        return simulate_cell_day((precip, et), cell, cell_count)

    model_output = simulate_modifications(census, fn=simulate_day)

    return {
        'census': census,
        'runoff': model_output,
        'quality': format_quality(model_output)
    }


def _get_precip_value(model_input):
    try:
        precips = [item for item in model_input['inputs']
                   if item['name'] == 'precipitation']
        return precips[0]['value']
    except Exception:
        return None


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
                'reclassification': 'a:chaparral',
                'cell_count': count * multiplier,
                'distribution': {
                    'c:commercial': {'cell_count': count * multiplier},
                }
            }
        ]

    return modifications
