# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import logging
import requests
import json

from ast import literal_eval as make_tuple

from StringIO import StringIO

from celery import shared_task

from django.conf import settings

from apps.modeling.tr55.utils import (aoi_resolution,
                                      precipitation,
                                      apply_modifications_to_census,
                                      )

from tr55.model import simulate_day
from gwlfe import gwlfe, parser

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54


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


def format_for_srat(huc12_id, model_output):
    formatted = {'huc12': huc12_id,
                 # Tile Drain may be calculated by future versions of
                 # Mapshed. The SRAT API requires a placeholder
                 'tpload_tiledrain': 0,
                 'tnload_tiledrain': 0,
                 'tssload_tiledrain': 0,
                 }

    for load in model_output['Loads']:
        source_key = settings.SRAT_KEYS.get(load['Source'], None)

        if source_key is None:
            continue

        formatted['tpload_' + source_key] = load['TotalP']
        formatted['tnload_' + source_key] = load['TotalN']

        if source_key not in ['farman',
                              'subsurface',
                              'septics',
                              'pointsource']:
            formatted['tssload_' + source_key] = load['Sediment']

    return formatted


@shared_task(throws=Exception)
def nlcd_soil(result):
    if 'error' in result:
        raise Exception('[nlcd_soil] {}'.format(result['error']))

    dist = {}
    total_count = 0

    for key, count in result.iteritems():
        # Extract (3, 4) from "List(3,4)"
        (n, s) = make_tuple(key[4:])
        # Map [NODATA, ad, bd] to c, [cd] to d
        s2 = 3 if s in [settings.NODATA, 5, 6] else 4 if s == 7 else s
        # Only count those values for which we have mappings
        if n in settings.NLCD_MAPPING and s2 in settings.SOIL_MAPPING:
            total_count += count
            label = '{soil}:{nlcd}'.format(soil=settings.SOIL_MAPPING[s2][0],
                                           nlcd=settings.NLCD_MAPPING[n][0])
            dist[label] = {'cell_count': (
                count + (dist[label]['cell_count'] if label in dist else 0)
            )}

    return [{
        'cell_count': total_count,
        'distribution': dist,
    }]


@shared_task
def run_tr55(censuses, aoi, model_input, cached_aoi_census=None):
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
def run_gwlfe(model_input, inputmod_hash, watershed_id=None):
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
    result['watershed_id'] = watershed_id

    return result


@shared_task
def run_srat(watersheds):
    try:
        data = [format_for_srat(id, w) for id, w in watersheds.iteritems()]
    except Exception as e:
        logger.error('Formatting sub-basin GWLF-E results failed: %s' % e)

    headers = {'x-api-key': settings.SRAT_CATCHMENT_API['api_key']}

    try:
        r = requests.post(settings.SRAT_CATCHMENT_API['url'],
                          headers=headers,
                          data=json.dumps(data))
    except Exception as e:
        logger.error('Request to SRAT Catchment API failed: %s' % e)

    try:
        result = r.json()
    except ValueError:
        logger.error('SRAT Catchment API did not return JSON')

    if (r.status_code != 200):
        logger.error('SRAT Catchment API request failed: %s' % result)

    return result


@shared_task
def subbasin_results_to_dict(subbasin_results):
    def popped_key_result(result):
        watershed_id = result.pop('watershed_id')
        return (watershed_id, result)

    popped_key_results = [popped_key_result(r) for r in subbasin_results]
    return dict(popped_key_results)


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
