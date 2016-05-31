# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from ast import literal_eval as make_tuple

from celery import shared_task
from celery.exceptions import Retry

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry

from apps.modeling.geoprocessing import sjs_submit, sjs_retrieve
from apps.modeling.mapshed.calcs import (day_lengths,
                                         nearest_weather_stations,
                                         growing_season,
                                         erosion_coeff,
                                         et_adjustment,
                                         kv_coefficient,
                                         animal_energy_units,
                                         ls_factors,
                                         manure_spread,
                                         streams,
                                         stream_length,
                                         point_source_discharge,
                                         weather_data,
                                         curve_number,
                                         sediment_phosphorus,
                                         groundwater_nitrogen_conc,
                                         sediment_delivery_ratio,
                                         landuse_pcts,
                                         normal_sys,
                                         sed_a_factor
                                         )

NLU = settings.GWLFE_CONFIG['NLU']
NRur = settings.GWLFE_DEFAULTS['NRur']
AG_NLCD_CODES = settings.GWLFE_CONFIG['AgriculturalNLCDCodes']
DRB = settings.DRB_PERIMETER
ACRES_PER_SQM = 0.000247105
HECTARES_PER_SQM = 0.0001
SQKM_PER_SQM = 0.000001


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def mapshed_start(self, opname, input_data):
    host = settings.GEOP['host']
    port = settings.GEOP['port']
    args = settings.GEOP['args']['MapshedJob']

    data = settings.GEOP['json'][opname].copy()
    data['input'].update(input_data)

    try:
        job_id = sjs_submit(host, port, args, data, retry=self.retry)

        return {
            'host': host,
            'port': port,
            'job_id': job_id
        }
    except Retry as r:
        raise r
    except Exception as x:
        return {
            'error': x.message
        }


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def mapshed_finish(self, incoming):
    if 'error' in incoming:
        return incoming

    try:
        return sjs_retrieve(retry=self.retry, **incoming)
    except Retry as r:
        # Celery throws a Retry exception when self.retry is called to stop
        # the execution of any further code, and to indicate to the worker
        # that the same task is going to be retried.
        # We capture and re-raise Retry to continue this behavior, and ensure
        # that it doesn't get passed to the next task like every other error.
        raise r
    except Exception as x:
        return {
            'error': x.message
        }


@shared_task
def collect_data(geop_result, geojson):
    geom = GEOSGeometry(geojson, srid=4326)
    area = geom.transform(5070, clone=True).area  # Square Meters

    # Data Model is called z by convention
    z = settings.GWLFE_DEFAULTS.copy()

    # Statically calculated lookup values
    z['DayHrs'] = day_lengths(geom)

    # Data from the Weather Stations dataset
    ws = nearest_weather_stations(geom)
    z['Grow'] = growing_season(ws)
    z['Acoef'] = erosion_coeff(ws, z['Grow'])
    z['PcntET'] = et_adjustment(ws)
    z['KV'] = kv_coefficient(z['Acoef'])
    z['WxYrBeg'] = int(max([w.begyear for w in ws]))
    z['WxYrEnd'] = int(min([w.endyear for w in ws]))
    z['WxYrs'] = z['WxYrEnd'] - z['WxYrBeg'] + 1

    # Data from the County Animals dataset
    livestock_aeu, poultry_aeu = animal_energy_units(geom)
    z['AEU'] = livestock_aeu / (area * ACRES_PER_SQM)
    z['n41j'] = livestock_aeu
    z['n41k'] = poultry_aeu
    z['n41l'] = livestock_aeu + poultry_aeu

    z['ManNitr'], z['ManPhos'] = manure_spread(z['AEU'])

    # Data from Streams dataset
    z['StreamLength'] = stream_length(geom)      # Meters
    z['n42b'] = round(z['StreamLength'] / 1000, 1)  # Kilometers

    # Data from Point Source Discharge dataset
    n_load, p_load, discharge = point_source_discharge(geom, area)
    z['PointNitr'] = n_load
    z['PointPhos'] = p_load
    z['PointFlow'] = discharge

    # Data from National Weather dataset
    temps, prcps = weather_data(ws, z['WxYrBeg'], z['WxYrEnd'])
    z['Temp'] = temps
    z['Prec'] = prcps

    # Begin processing geop_result
    z['AgLength'] = geop_result['ag_stream_pct'] * z['StreamLength']
    z['UrbLength'] = z['StreamLength'] - z['AgLength']
    z['n42'] = round(z['AgLength'] / 1000, 1)
    z['n46e'] = (geop_result['med_high_urban_stream_pct'] *
                 z['StreamLength'] / 1000)
    z['n46f'] = geop_result['low_urban_stream_pct'] * z['StreamLength'] / 1000

    z['CN'] = geop_result['cn']
    z['SedPhos'] = geop_result['sed_phos']
    z['Area'] = [percent * area * HECTARES_PER_SQM
                 for percent in geop_result['landuse_pcts']]
    z['UrbAreaTotal'] = sum(z['Area'][NRur:])

    z['NormalSys'] = normal_sys(z['Area'])

    z['AgSlope3'] = geop_result['ag_slope_3_pct'] * area * HECTARES_PER_SQM
    z['AgSlope3To8'] = (geop_result['ag_slope_3_8_pct'] *
                        area * HECTARES_PER_SQM)
    z['n41'] = geop_result['n41']

    z['AvSlope'] = geop_result['avg_slope']

    z['AvKF'] = geop_result['avg_kf']
    z['KF'] = geop_result['kf']

    # Original at Class1.vb@1.3.0:9803-9807
    z['n23'] = z['Area'][1]    # Row Crops Area
    z['n23b'] = z['Area'][13]  # High Density Mixed Urban Area
    z['n24'] = z['Area'][0]    # Hay/Pasture Area
    z['n24b'] = z['Area'][11]  # Low Density Mixed Urban Area

    z['SedDelivRatio'] = sediment_delivery_ratio(area * SQKM_PER_SQM)
    z['TotArea'] = area * HECTARES_PER_SQM
    z['GrNitrConc'] = geop_result['gr_nitr_conc']
    z['GrPhosConc'] = geop_result['gr_phos_conc']
    z['MaxWaterCap'] = geop_result['avg_awc']
    z['SedAFactor'] = sed_a_factor(geop_result['landuse_pcts'],
                                   z['CN'], z['AEU'], z['AvKF'], z['AvSlope'])

    ls_stream_length = (stream_length(geom, drb=True) if geom.within(DRB)
                        else z['StreamLength'])

    z['LS'] = ls_factors(geop_result['lu_stream_pct'],
                         ls_stream_length, z['Area'], z['AvSlope'])

    return z


@shared_task(throws=Exception)
def nlcd_streams(sjs_result):
    """
    From a dictionary mapping NLCD codes to the count of stream pixels on
    each, return a dictionary with keys 'ag_stream_pct', 'low_urban_stream_pct'
    and 'med_high_urban_stream_pct' which indicate the percent of streams in
    agricultural areas (namely NLCD 81 Pasture/Hay and 82 Cultivated Crops),
    low density urban areas (NLCD 22), and medium and high density urban areas
    (NLCD 23 and 24) respectively.

    In addition, we inspect the result to see if it includes an 'error' key.
    If so, it would indicate that a preceeding task has thrown an exception,
    and thus we throw an exception with that message.

    We throw the actual exception in this final task in the chain, rather than
    one of the preceeding ones, because when creating a chain the resulting
    AsyncResult points to the last task in the chain. If task in the middle of
    the chain fails, and the last task doesn't run, the AsyncResult is never
    marked as Ready. In the case of pure chains this can be addressed with a
    simple link_error, but in the case of chords the entire set of tasks in
    the chord's header needs to be Ready before the body can execute. Thus, if
    the final task never runs, Celery repeatedly calls chord_unlock infinitely
    causing overflows. By throwing the exception in the final task instead of
    an intermediate one, we ensure that the group is marked as Ready, and the
    chord is notified of the failure and suspends execution gracefully.

    Furthermore, this task is decorated with 'throws=Exception' so that the
    exception is logged as INFO, rather than ERROR. This is because we have
    already logged it as an ERROR the first time it was thrown up the chain,
    and this will reduce noise in the logs.

    This task should be used as a template for making other geoprocessing
    post-processing tasks, to be used in geop_tasks.
    """
    if 'error' in sjs_result:
        raise Exception('[nlcd_streams] {}'.format(sjs_result['error']))

    # Parse SJS results
    # This can't be done in mapshed_finish because the keys may be tuples,
    # which are not JSON serializable and thus can't be shared between tasks
    result = parse_sjs_result(sjs_result)

    ag_count = sum(result.get(nlcd, 0) for nlcd in AG_NLCD_CODES)
    low_urban_count = result.get(22, 0)
    med_high_urban_count = sum(result.get(nlcd, 0) for nlcd in [23, 24])
    total = sum(result.values())

    ag, low, med_high = (float(count) / total
                         if total > 0 else 0
                         for count in (ag_count,
                                       low_urban_count,
                                       med_high_urban_count))
    lu_stream_pct = [0.0] * 16
    for nlcd, stream_count in result.iteritems():
        lu = get_lu_index(nlcd)
        if lu is not None:
            lu_stream_pct[lu] += float(stream_count) / total

    return {
        'ag_stream_pct': ag,
        'low_urban_stream_pct': low,
        'med_high_urban_stream_pct': med_high,
        'lu_stream_pct': lu_stream_pct
    }


@shared_task(throws=Exception)
def nlcd_soils(sjs_result):
    """
    Results are expected to be in the format:
    {
      (NLCD ID, Soil Group ID, Soil Texture ID): Count,
    }

    We calculate a number of values relying on various combinations
    of these raster datasets.
    """
    if 'error' in sjs_result:
        raise Exception('[nlcd_soils] {}'.format(sjs_result['error']))

    ngt_count = parse_sjs_result(sjs_result)

    # Split combined counts into separate ones for processing
    # Reduce [(n, g, t): c] to
    n_count = {}   # [n: sum(c)]
    ng_count = {}  # [(n, g): sum(c)]
    nt_count = {}  # [(n, t): sum(c)]
    for (n, g, t), count in ngt_count.iteritems():
        n_count[n] = count + n_count.get(n, 0)
        nt_count[(n, t)] = count + nt_count.get((n, t), 0)

        # Map soil group values to usable subset
        g2 = settings.SOIL_GROUP[g]
        ng_count[(n, g2)] = count + ng_count.get((n, g2), 0)

    return {
        'cn': curve_number(n_count, ng_count),
        'sed_phos': sediment_phosphorus(nt_count),
        'landuse_pcts': landuse_pcts(n_count),
    }


@shared_task(throws=Exception)
def gwn(sjs_result):
    """
    Derive Groundwater Nitrogen and Phosphorus
    """
    if 'error' in sjs_result:
        raise Exception('[gwn] {}'
                        .format(sjs_result['error']))

    result = parse_sjs_result(sjs_result)
    gr_nitr_conc, gr_phos_conc = groundwater_nitrogen_conc(result)

    return {
        'gr_nitr_conc': gr_nitr_conc,
        'gr_phos_conc': gr_phos_conc
    }


@shared_task(throws=Exception)
def avg_awc(sjs_result):
    """
    Get `AvgAwc` from MMW-Geoprocessing endpoint

    Original at Class1.vb@1.3.0:4150
    """
    if 'error' in sjs_result:
        raise Exception('[awc] {}'
                        .format(sjs_result['error']))

    result = parse_sjs_result(sjs_result)

    return {
        'avg_awc': result.values()[0]
    }


@shared_task(throws=Exception)
def nlcd_slope(result):
    if 'error' in result:
        raise Exception('[nlcd_slope] {}'.format(result['error']))

    result = parse_sjs_result(result)

    ag_slope_3_count = 0
    ag_slope_3_8_count = 0
    ag_count = 0
    total_count = 0

    for (nlcd_code, slope), count in result.iteritems():
        if nlcd_code in AG_NLCD_CODES:
            if slope > 3:
                ag_slope_3_count += count
            if 3 < slope < 8:
                ag_slope_3_8_count += count
            ag_count += count

        total_count += count

    # percent of AOI that is agricultural with slope > 3%
    # see Class1.vb#7223
    ag_slope_3_pct = (float(ag_slope_3_count) / total_count
                      if total_count > 0 else 0.0)

    # percent of AOI that is agricultural with 3% < slope < 8%
    ag_slope_3_8_pct = (float(ag_slope_3_8_count) / total_count
                        if total_count > 0 else 0.0)

    # percent of agricultural parts of AOI with slope > 3%
    # see Class1.vb#9864
    n41 = float(ag_slope_3_count) / ag_count if ag_count > 0 else 0.0

    output = {
        'ag_slope_3_pct': ag_slope_3_pct,
        'ag_slope_3_8_pct': ag_slope_3_8_pct,
        'n41': n41
    }

    return output


@shared_task(throws=Exception)
def slope(result):
    if 'error' in result:
        raise Exception('[slope] {}'.format(result['error']))

    result = parse_sjs_result(result)

    # average slope over the AOI
    # see Class1.vb#6252
    avg_slope = result[0]

    output = {
        'avg_slope': avg_slope
    }

    return output


@shared_task(throws=Exception)
def nlcd_kfactor(result):
    if 'error' in result:
        raise Exception('[nlcd_kfactor] {}'.format(result['error']))

    result = parse_sjs_result(result)

    # average kfactor for each land use
    # see Class1.vb#6431
    kf = [0.0] * NLU
    for nlcd_code, kfactor in result.iteritems():
        lu_ind = get_lu_index(nlcd_code)
        if lu_ind is not None:
            kf[lu_ind] = kfactor

    # average kfactor across all land uses, ignoring zero values
    # see Class1.vb#4151
    num_nonzero_kf = len([k for k in kf if k != 0.0])
    avg_kf = 0.0
    if num_nonzero_kf != 0:
        avg_kf = sum(kf) / num_nonzero_kf

    output = {
        'kf': kf,
        'avg_kf': avg_kf
    }

    return output


def geop_tasks(geom, errback):
    # List of tuples of (opname, data, callback) for each geop task
    definitions = [
        ('nlcd_streams',
         {'polygon': [geom.geojson], 'vector': streams(geom)},
         nlcd_streams),
        ('nlcd_soils', {'polygon': [geom.geojson]}, nlcd_soils),
        ('gwn',
         {'polygon': [geom.geojson]}, gwn),
        ('avg_awc',
         {'polygon': [geom.geojson]}, avg_awc),
        ('nlcd_slope',
         {'polygon': [geom.geojson]},
         nlcd_slope),
        ('slope',
         {'polygon': [geom.geojson]},
         slope),
        ('nlcd_kfactor',
         {'polygon': [geom.geojson]},
         nlcd_kfactor)
    ]

    return [(mapshed_start.s(opname, data) |
             mapshed_finish.s() |
             callback.s().set(link_error=errback))
            for (opname, data, callback) in definitions]


@shared_task
def combine(geop_results):
    """
    Flattens the incoming results dictionaries into one
    which has all the keys of the components.

    This could be a part of collect_data, but we need
    a buffer in a chord as a workaround to
    https://github.com/celery/celery/issues/3191
    """
    return {k: v for r in geop_results for k, v in r.items()}


def parse_sjs_result(sjs_result):
    # Convert string "List(1,2,3)" into tuple (1,2,3) for each key
    return {make_tuple(key[4:]): val for key, val in sjs_result.items()}


def get_lu_index(nlcd):
    # Convert NLCD code into MapShed Land Use Index
    if nlcd == 81:
        lu_index = 1
    elif nlcd == 82:
        lu_index = 2
    elif nlcd in [41, 42, 43, 52]:
        lu_index = 3
    elif nlcd in [90, 95]:
        lu_index = 4
    elif nlcd in [21, 71]:
        lu_index = 7
    elif nlcd in [12, 31]:
        lu_index = 8
    elif nlcd == 22:
        lu_index = 11
    elif nlcd == 23:
        lu_index = 12
    elif nlcd == 24:
        lu_index = 13
    else:
        return None

    return lu_index - 1
