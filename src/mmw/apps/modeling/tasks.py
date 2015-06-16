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
def make_gt_service_call_task(model_input):
    """
    Call geotrellis and calculate the tile data for use in the TR55 model.
    """

    # TODO actually call geotrellis with model_input
    census = {
        'cell_count': 8,
        'distribution': {
            'c:commercial': {'cell_count': 5},
            'a:deciduous_forest': {'cell_count': 3}
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
        ]
    }
    return census


def format_quality(model_output):
    metrics = ['Biochemical Oxygen Demand',
               'Total Suspended Solids',
               'Total Nitrogen',
               'Total Phosphorus']
    codes = ['bod', 'tss', 'tn', 'tp']

    def fn(input):
        metric, code = input
        return {
            'metric': metric,
            'pounds': model_output['modified'][code]
        }

    return map(fn, zip(metrics, codes))


@shared_task
def run_tr55(census, model_input):
    """
    A thin Celery wrapper around our TR55 implementation.
    """

    et_max = 0.207
    precip = model_input['precip']

    def simulate_day(cell, cell_count):
        soil_type, land_use = cell.lower().split(':')
        et = et_max * lookup_ki(land_use)
        return simulate_cell_day((precip, et), cell, cell_count)

    model_output = simulate_modifications(census, fn=simulate_day)
    return {
        'runoff': model_output,
        'quality': format_quality(model_output)
    }
