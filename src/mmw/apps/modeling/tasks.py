# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import logging

from apps.modeling.geoprocessing import geojson_to_survey, \
    geojson_to_census, geojson_to_censuses

from tr55.model import simulate_day

logger = logging.getLogger(__name__)

FE_BE_MAP = {
    'lir':                 'li_residential',
    'hir':                 'hi_residential',
    'commercial':          'commercial',
    'forest':              'mixed_forest',
    'turf_grass':          'urban_grass',
    'pasture':             'pasture',
    'grassland':           'grassland',
    'row_crop':            'row_crop',
    'chaparral':           'chaparral',
    'tg_prairie':          'tall_grass_prairie',
    'sg_prairie':          'short_grass_prairie',
    'desert':              'desert',
    'rain_garden':         'rain_garden',
    'veg_infil_basin':     'infiltration_trench',
    'porous_paving':       'porous_paving',
    'green_roof':          'green_roof',
    'no_till_agriculture': 'no_till',
    'cluster_housing':     'cluster_housing'
}


@shared_task
def run_analyze(area_of_interest):
    """
    Call geotrellis and return a survey of the area of interest.
    """
    return geojson_to_survey(area_of_interest)


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
            'load': model_output['modified'][code]
        }

    return map(fn, zip(measures, codes))


@shared_task
def run_tr55(census, model_input):
    """
    A thin Celery wrapper around our TR55 implementation.
    """
    precip = _get_precip_value(model_input)

    if precip is None:
        raise Exception('No precipitation value defined')

    modifications = get_census_modifications(model_input)
    census['modifications'] = modifications

    model_output = simulate_day(census, precip)

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


def get_census_modifications(model_input):
    def change_key(modification):
        name = modification['name']
        value = FE_BE_MAP[modification['value']]

        if name == 'landcover':
            return {'change': ':%s:' % value}
        elif name == 'conservation_practice':
            return {'change': '::%s' % value}

    raw_mods = model_input['modifications']
    changes = [change_key(m) for m in raw_mods]
    modifications = geojson_to_censuses({
        'type': 'GeometryCollection',
        'geometries': [m['shape']['geometry'] for m in raw_mods]
    })

    for (m, c) in zip(modifications, changes):
        m.update(c)

    return modifications
