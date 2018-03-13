# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry

from apps.modeling.geoprocessing import run, parse
from apps.modeling.mapshed.calcs import (day_lengths,
                                         nearest_weather_stations,
                                         growing_season,
                                         erosion_coeff,
                                         et_adjustment,
                                         kv_coefficient,
                                         animal_energy_units,
                                         ag_ls_c_p,
                                         ls_factors,
                                         p_factors,
                                         manure_spread,
                                         streams,
                                         stream_length,
                                         point_source_discharge,
                                         weather_data,
                                         curve_number,
                                         phosphorus_conc,
                                         groundwater_nitrogen_conc,
                                         sediment_delivery_ratio,
                                         landuse_pcts,
                                         num_normal_sys,
                                         sed_a_factor
                                         )


NLU = settings.GWLFE_CONFIG['NLU']
NRur = settings.GWLFE_DEFAULTS['NRur']
AG_NLCD_CODES = settings.GWLFE_CONFIG['AgriculturalNLCDCodes']
DRB = settings.DRB_PERIMETER
ANIMAL_KEYS = settings.GWLFE_CONFIG['AnimalKeys']
ACRES_PER_SQM = 0.000247105
HECTARES_PER_SQM = 0.0001
SQKM_PER_SQM = 0.000001
NO_LAND_COVER = 'NO_LAND_COVER'


@shared_task
def collect_data(geop_results, geojson, watershed_id=None):
    geop_result = {k: v for r in geop_results for k, v in r.items()}

    geom = GEOSGeometry(geojson, srid=4326)
    area = geom.transform(5070, clone=True).area  # Square Meters

    # Data Model is called z by convention
    z = settings.GWLFE_DEFAULTS.copy()

    z['watershed_id'] = watershed_id

    # Statically calculated lookup values
    z['DayHrs'] = day_lengths(geom)

    # Data from the Weather Stations dataset
    ws = nearest_weather_stations(geom)
    z['Grow'] = growing_season(ws)
    z['Acoef'] = erosion_coeff(ws, z['Grow'])
    z['PcntET'] = et_adjustment(ws)
    z['WxYrBeg'] = int(max([w.begyear for w in ws]))
    z['WxYrEnd'] = int(min([w.endyear for w in ws]))
    z['WxYrs'] = z['WxYrEnd'] - z['WxYrBeg'] + 1

    # Data from the County Animals dataset
    ag_lscp = ag_ls_c_p(geom)
    z['C'][0] = ag_lscp.hp_c
    z['C'][1] = ag_lscp.crop_c

    livestock_aeu, poultry_aeu, population = animal_energy_units(geom)
    z['AEU'] = livestock_aeu / (area * ACRES_PER_SQM)
    z['n41j'] = livestock_aeu
    z['n41k'] = poultry_aeu
    z['n41l'] = livestock_aeu + poultry_aeu
    z['NumAnimals'] = [int(population.get(animal, 0))
                       for animal in ANIMAL_KEYS]

    z['ManNitr'], z['ManPhos'] = manure_spread(z['AEU'])

    # Data from Streams dataset
    z['StreamLength'] = stream_length(geom)      # Meters
    z['n42b'] = round(z['StreamLength'] / 1000, 1)  # Kilometers

    # Data from Point Source Discharge dataset
    n_load, p_load, discharge = point_source_discharge(geom, area,
                                                       drb=geom.within(DRB))
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
    z['SedPhos'] = geop_result['soilp']
    z['Area'] = [percent * area * HECTARES_PER_SQM
                 for percent in geop_result['landuse_pcts']]

    # Immediately return an error if z['Area'] is a list of 0s
    if sum(z['Area']) == 0:
        raise Exception(NO_LAND_COVER)

    z['UrbAreaTotal'] = sum(z['Area'][NRur:])
    z['PhosConc'] = phosphorus_conc(z['SedPhos'])

    z['NumNormalSys'] = num_normal_sys(z['Area'])

    z['AgSlope3'] = geop_result['ag_slope_3_pct'] * area * HECTARES_PER_SQM
    z['AgSlope3To8'] = (geop_result['ag_slope_3_8_pct'] *
                        area * HECTARES_PER_SQM)
    z['n41'] = geop_result['n41']

    z['AvSlope'] = geop_result['avg_slope']

    z['AvKF'] = geop_result['avg_kf']
    z['KF'] = geop_result['kf']

    z['KV'] = kv_coefficient(geop_result['landuse_pcts'], z['Grow'])

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

    z['LS'] = ls_factors(geop_result['lu_stream_pct'], z['StreamLength'],
                         z['Area'], z['AvSlope'], ag_lscp)

    z['P'] = p_factors(z['AvSlope'], ag_lscp)

    z['SedNitr'] = geop_result['soiln']

    z['RecessionCoef'] = geop_result['recess_coef']

    return z


@shared_task(throws=Exception)
def nlcd_streams(result):
    """
    From a dictionary mapping NLCD codes to the count of stream pixels on
    each, return a dictionary with keys 'ag_stream_pct', 'low_urban_stream_pct'
    and 'med_high_urban_stream_pct' which indicate the percent of streams in
    agricultural areas (namely NLCD 81 Pasture/Hay and 82 Cultivated Crops),
    low density urban areas (NLCD 21 and 22), and medium and high density urban
    areas (NLCD 23 and 24) respectively.

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
    if 'error' in result:
        raise Exception('[nlcd_streams] {}'.format(result['error']))

    # This can't be done in geoprocessing.run because the keys may be tuples,
    # which are not JSON serializable and thus can't be shared between tasks
    result = parse(result)

    ag_count = sum(result.get(nlcd, 0) for nlcd in AG_NLCD_CODES)
    low_urban_count = sum(result.get(nlcd, 0) for nlcd in [21, 22])
    med_high_urban_count = sum(result.get(nlcd, 0) for nlcd in [23, 24])
    total = sum(result.values())

    ag, low, med_high = (float(count) / total
                         if total > 0 else 0
                         for count in (ag_count,
                                       low_urban_count,
                                       med_high_urban_count))
    lu_stream_pct = [0.0] * NLU
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
def nlcd_streams_drb(result):
    """
    This callback is run when the geometry falls within the DRB. We calculate
    the percentage of DRB streams in each land use type.
    """
    if 'error' in result:
        raise Exception('[nlcd_streams_drb] {}'.format(result['error']))

    result = parse(result)
    total = sum(result.values())

    lu_stream_pct_drb = [0.0] * NLU
    for nlcd, stream_count in result.iteritems():
        lu = get_lu_index(nlcd)
        if lu is not None:
            lu_stream_pct_drb[lu] += float(stream_count) / total

    return {
        'lu_stream_pct_drb': lu_stream_pct_drb
    }


@shared_task(throws=Exception)
def nlcd_soil(result):
    """
    Results are expected to be in the format:
    {
      (NLCD ID, Soil Group ID): Count,
    }

    We calculate a number of values relying on various combinations
    of these raster datasets.
    """
    if 'error' in result:
        raise Exception('[nlcd_soil] {}'.format(result['error']))

    ng_count = parse(result)

    # Raise exception if no NLCD values
    if len(ng_count.values()) == 0:
        raise Exception(NO_LAND_COVER)

    # Split combined counts into separate ones for processing
    # Reduce [(n, g, t): c] to
    n_count = {}   # [n: sum(c)]
    ng2_count = {}  # [(n, g): sum(c)]
    for (n, g), count in ng_count.iteritems():
        n_count[n] = count + n_count.get(n, 0)

        # Map soil group values to usable subset
        g2 = settings.SOIL_GROUP[g]
        ng2_count[(n, g2)] = count + ng2_count.get((n, g2), 0)

    return {
        'cn': curve_number(n_count, ng2_count),
        'landuse_pcts': landuse_pcts(n_count),
    }


@shared_task(throws=Exception)
def gwn(result):
    """
    Derive Groundwater Nitrogen and Phosphorus
    """
    if 'error' in result:
        raise Exception('[gwn] {}'
                        .format(result['error']))

    result = parse(result)
    gr_nitr_conc, gr_phos_conc = groundwater_nitrogen_conc(result)

    return {
        'gr_nitr_conc': gr_nitr_conc,
        'gr_phos_conc': gr_phos_conc
    }


@shared_task(throws=Exception)
def avg_awc(result):
    """
    Get `AvgAwc` from MMW-Geoprocessing endpoint

    Original at Class1.vb@1.3.0:4150
    """
    if 'error' in result:
        raise Exception('[awc] {}'
                        .format(result['error']))

    result = parse(result)

    return {
        'avg_awc': result.values()[0]
    }


@shared_task(throws=Exception)
def soilp(result):
    """
    Get `SoilP` from MMW-Geoprocessing endpoint

    Originally calculated via lookup table at Class1.vb@1.3.0:8975-8988
    """
    if 'error' in result:
        raise Exception('[soilp] {}'
                        .format(result['error']))

    result = parse(result)

    soilp = result.values()[0] * 1.6

    return {
        'soilp': soilp
    }


@shared_task(throws=Exception)
def recess_coef(result):
    """
    Get `RecessCoef` from MMW-Geoprocessing endpoint

    Originally a static value 0.06 Class1.vb@1.3.0:10333
    """
    if 'error' in result:
        raise Exception('[recess_coef] {}'
                        .format(result['error']))

    result = parse(result)

    recess_coef = result.values()[0] * -0.0015 + 0.1103
    recess_coef = recess_coef if recess_coef >= 0 else 0.01

    return {
        'recess_coef': recess_coef
    }


@shared_task(throws=Exception)
def soiln(result):
    """
    Get `SoilN` from MMW-Geoprocessing endpoint

    Originally a static value of 2000 at Class1.vb@1.3.0:9587
    """
    if 'error' in result:
        raise Exception('[soiln] {}'
                        .format(result['error']))

    result = parse(result)

    soiln = result.values()[0] * 7.0

    return {
        'soiln': soiln
    }


@shared_task(throws=Exception)
def nlcd_slope(result):
    if 'error' in result:
        raise Exception('[nlcd_slope] {}'.format(result['error']))

    result = parse(result)

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

    result = parse(result)

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

    result = parse(result)

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


def geoprocessing_chains(aoi, wkaoi, errback):
    task_defs = [
        ('nlcd_soil',    nlcd_soil,    {'polygon': [aoi]}),
        ('soiln',        soiln,        {'polygon': [aoi]}),
        ('soilp',        soilp,        {'polygon': [aoi]}),
        ('recess_coef',  recess_coef,  {'polygon': [aoi]}),
        ('gwn',          gwn,          {'polygon': [aoi]}),
        ('avg_awc',      avg_awc,      {'polygon': [aoi]}),
        ('nlcd_slope',   nlcd_slope,   {'polygon': [aoi]}),
        ('slope',        slope,        {'polygon': [aoi]}),
        ('nlcd_kfactor', nlcd_kfactor, {'polygon': [aoi]}),
        ('nlcd_streams', nlcd_streams, {'polygon': [aoi],
                                        'vector': streams(aoi)}),
    ]

    return [
        run.s(opname, data, wkaoi) |
        callback.s().set(link_error=errback)
        for (opname, callback, data) in task_defs
    ]


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
    elif nlcd == 71:
        lu_index = 7
    elif nlcd in [12, 31]:
        lu_index = 8
    elif nlcd in [21, 22]:
        lu_index = 11
    elif nlcd == 23:
        lu_index = 12
    elif nlcd == 24:
        lu_index = 13
    else:
        return None

    return lu_index - 1
