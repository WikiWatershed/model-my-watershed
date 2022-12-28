# -*- coding: utf-8 -*-
import logging
import requests
import json

from ast import literal_eval as make_tuple
from requests.exceptions import ConnectionError, Timeout
from io import StringIO
from functools import reduce

from celery import shared_task

from django.conf import settings

from mmw.settings import layer_classmaps

from apps.core.models import Job
from apps.modeling.calcs import apply_subbasin_gwlfe_modifications
from apps.modeling.tr55.utils import (aoi_resolution,
                                      precipitation,
                                      apply_modifications_to_census,
                                      )

from tr55.model import simulate_day
from gwlfe import gwlfe, Parser

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

        quality[key] = list(map(map_and_convert_units, zip(measures, codes)))

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


def format_subbasin(huc12_gwlfe_results, srat_catchment_results, gmss):
    def empty_source(s):
        return {'Source': s,
                'TotalN': 0, 'TotalP': 0, 'Sediment': 0,
                'Area': 0}

    def add_huc12_source(source, srat_huc12, source_areas, total_area):
        source_name = source['Source']
        source_key = settings.SRAT_KEYS[source_name]
        total_n = srat_huc12.get('tnload_' + source_key, 0)
        total_p = srat_huc12.get('tpload_' + source_key, 0)
        sediment = srat_huc12.get('tssload_' + source_key, 0)

        normalizing_areas = settings.SUBBASIN_SOURCE_NORMALIZING_AREAS
        source_area_idxs = normalizing_areas.get(source_name, None)
        area = sum([source_areas[i] for i in source_area_idxs]) \
            if source_area_idxs else total_area

        source['TotalN'] += total_n
        source['TotalP'] += total_p
        source['Sediment'] += sediment
        source['Area'] += area

        return {
            'Source': source_name,
            'TotalN': total_n,
            'TotalP': total_p,
            'Sediment': sediment,
            'Area': area,
        }

    def format_catchment(srat_catchment, loads_template):
        for key, value in srat_catchment.items():
            # A sample load source key is 'tnload_hp'.
            # The first half 'tnload' indicates which kinds of loads
            # The second half 'hp' is the acronym of the source of loads
            if '_' in key:
                load_type, load_source = key.split('_')
                for load in loads_template:
                    if load_source == settings.SRAT_KEYS[load['Source']]:
                        add_load_by_key(load_type, value, load)

        return {
            'TotalLoadingRates': {
                'TotalN': srat_catchment['tnloadrate_total'],
                'TotalP': srat_catchment['tploadrate_total'],
                'Sediment': srat_catchment['tssloadrate_total'],
            },
            'LoadingRateConcentrations': {
                'TotalN': srat_catchment['tnloadrate_conc'],
                'TotalP': srat_catchment['tploadrate_conc'],
                'Sediment': srat_catchment['tssloadrate_conc'],
            },
            'Loads': loads_template
        }

    def add_load_by_key(load_type, value, load):
        type_mapping = {
            'tpload': 'TotalP',
            'tnload': 'TotalN',
            'tssload': 'Sediment'
        }

        if load_type in type_mapping:
            load[type_mapping[load_type]] = value

        return load

    def catchment_template(keys_template):
        return [{
            'Source': key_name,
            'TotalN': 0,
            'TotalP': 0,
            'Sediment': 0
        } for key_name in keys_template.keys()]

    def sum_loads(loads):
        def add_load(sums, load):
            (sediment_sum,
             nitrogen_sum,
             phosphorus_sum) = sums
            return (sediment_sum + load['Sediment'],
                    nitrogen_sum + load['TotalN'],
                    phosphorus_sum + load['TotalP'])

        return reduce(add_load, loads, (0, 0, 0))

    def build_summary_loads(loads, area):
        (sum_sed, sum_n, sum_p) = sum_loads(loads)
        return {
            'Source': 'Entire area',
            'Area': area,
            'Sediment': sum_sed,
            'TotalN': sum_n,
            'TotalP': sum_p,
        }

    def add_huc12(srat_huc12, aggregate):
        area = huc12_gwlfe_results[srat_huc12['huc12']]['AreaTotal']
        source_areas = gmss[srat_huc12['huc12']]['Area']
        loads = [add_huc12_source(s, srat_huc12, source_areas, area)
                 for s in aggregate['Loads']]
        summary_loads = build_summary_loads(loads, area)
        catchment_loads_template = catchment_template(settings.SRAT_KEYS)

        # Build up the full AOI's values with the huc-12's
        aggregate['SummaryLoads']['Area'] += area
        aggregate['SummaryLoads']['Sediment'] += summary_loads['Sediment']
        aggregate['SummaryLoads']['TotalN'] += summary_loads['TotalN']
        aggregate['SummaryLoads']['TotalP'] += summary_loads['TotalP']

        return {
            'Loads': loads,
            'SummaryLoads': summary_loads,
            'Catchments': {
                comid: format_catchment(result, catchment_loads_template)
                for comid, result in srat_huc12['catchments'].items()},
            'Raw': huc12_gwlfe_results[srat_huc12['huc12']]
        }

    aggregate = {
        'Loads': [empty_source(source_name)
                  for source_name in settings.SRAT_KEYS.keys()],
        'SummaryLoads': empty_source('Entire area'),
        # All gwlf-e results should have the same inputmod hash,
        # so grab any of them
        'inputmod_hash': next(iter(
            huc12_gwlfe_results.values()))['inputmod_hash'],
    }

    aggregate['HUC12s'] = {huc12_id: add_huc12(result, aggregate)
                           for huc12_id, result
                           in srat_catchment_results['huc12s'].items()}

    return aggregate


@shared_task(throws=Exception)
def nlcd_soil_tr55(results):
    if 'error' in results:
        raise Exception(f'[nlcd_soil_tr55] {results["error"]}')

    return [nlcd_soil(result) for result in results]


def nlcd_soil(result):
    dist = {}
    total_count = 0

    for key, count in result.items():
        # Extract (3, 4) from "List(3,4)"
        (n, s) = make_tuple(key[4:])
        # Map [NODATA, ad, bd] to c, [cd] to d
        s2 = 3 if s in [settings.NODATA, 5, 6] else 4 if s == 7 else s
        # Only count those values for which we have mappings
        if n in layer_classmaps.NLCD and s2 in layer_classmaps.SOIL:
            total_count += count
            label = '{soil}:{nlcd}'.format(soil=layer_classmaps.SOIL[s2][0],
                                           nlcd=layer_classmaps.NLCD[n][0])
            dist[label] = {'cell_count': (
                count + (dist[label]['cell_count'] if label in dist else 0)
            )}

    return {
        'cell_count': total_count,
        'distribution': dist,
    }


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

    reader = Parser.GmsReader(output)
    z = reader.read()

    result, _ = gwlfe.run(z)
    result['inputmod_hash'] = inputmod_hash
    result['watershed_id'] = watershed_id

    return result


@shared_task
def run_subbasin_gwlfe_chunks(mapshed_job_uuid, modifications,
                              total_stream_lengths, inputmod_hash,
                              watershed_ids):
    mapshed_job = Job.objects.get(uuid=mapshed_job_uuid)
    model_input = json.loads(mapshed_job.result)

    return [
        run_gwlfe(apply_subbasin_gwlfe_modifications(model_input[watershed_id],
                                                     modifications,
                                                     total_stream_lengths),
                  inputmod_hash,
                  watershed_id)
        for watershed_id in watershed_ids
    ]


@shared_task
def run_srat(watersheds, mapshed_job_uuid):
    try:
        data = [format_for_srat(id, w) for id, w in watersheds.items()]
    except Exception as e:
        raise Exception('Formatting sub-basin GWLF-E results failed: %s' % e)

    headers = {'x-api-key': settings.SRAT_CATCHMENT_API['api_key']}

    try:
        r = requests.post(settings.SRAT_CATCHMENT_API['url'],
                          headers=headers,
                          data=json.dumps(data),
                          timeout=settings.TASK_REQUEST_TIMEOUT)
    except Timeout:
        raise Exception('Request to SRAT Catchment API timed out')
    except ConnectionError:
        raise Exception('Failed to connect to SRAT Catchment API')

    if (r.status_code != 200):
        raise Exception('SRAT Catchment API request failed: %s %s' %
                        (r.status_code, r.text))

    try:
        srat_catchment_result = r.json()
    except ValueError:
        raise Exception('SRAT Catchment API did not return JSON')

    try:
        mapshed_job = Job.objects.get(uuid=mapshed_job_uuid)
        gmss = json.loads(mapshed_job.result)
        result = format_subbasin(watersheds, srat_catchment_result, gmss)
    except KeyError as e:
        raise Exception('SRAT Catchment API returned malformed result: %s' % e)

    return result


@shared_task
def subbasin_results_to_dict(subbasin_results):
    def popped_key_result(result):
        watershed_id = result.pop('watershed_id')
        return (watershed_id, result)

    is_chunked = isinstance(subbasin_results[0], list)
    popped_key_results = [popped_key_result(r) for chunk in subbasin_results
                          for r in chunk] if is_chunked else \
                         [popped_key_result(r) for r in subbasin_results]
    return dict(popped_key_results)


def to_gms_file(mapshed_data):
    """
    Given a dictionary of MapShed data, uses GWLF-E to convert it to a GMS file
    """
    mapshed_areas = [round(a, 1) for a in mapshed_data['Area']]
    mapshed_data['Area'] = mapshed_areas

    pre_z = Parser.DataModel(mapshed_data)
    output = StringIO()
    writer = Parser.GmsWriter(output)
    writer.write(pre_z)

    output.seek(0)

    return output
