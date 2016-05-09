# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import numpy as np

from os.path import join, dirname, abspath
from ast import literal_eval as make_tuple

from celery import shared_task
from celery.exceptions import Retry

from gwlfe import gwlfe, parser
from gwlfe.datamodel import DataModel

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry

from apps.modeling.geoprocessing import sjs_submit, sjs_retrieve
from apps.modeling.mapshed.calcs import (day_lengths,
                                         nearest_weather_stations,
                                         growing_season,
                                         erosion_coeff,
                                         et_adjustment,
                                         animal_energy_units,
                                         manure_spread,
                                         streams,
                                         stream_length,
                                         point_source_discharge,
                                         weather_data,
                                         )

ACRES_PER_SQM = 0.000247105


@shared_task
def mapshed_start(opname, input_data):
    host = settings.GEOP['host']
    port = settings.GEOP['port']
    args = settings.GEOP['args']['MapshedJob']

    data = settings.GEOP['json'][opname].copy()
    data['input'].update(input_data)

    try:
        job_id = sjs_submit(host, port, args, data)

        return {
            'host': host,
            'port': port,
            'job_id': job_id
        }

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
    z = DataModel(settings.GWLFE_DEFAULTS)

    # Statically calculated lookup values
    z.DayHrs = day_lengths(geom)

    # Data from the Weather Stations dataset
    ws = nearest_weather_stations(geom)
    z.Grow = growing_season(ws)
    z.Acoef = erosion_coeff(ws, z.Grow)
    z.PcntET = et_adjustment(ws)
    z.WxYrBeg = max([w.begyear for w in ws])
    z.WxYrEnd = min([w.endyear for w in ws])
    z.WxYrs = z.WxYrEnd - z.WxYrBeg + 1

    # Data from the County Animals dataset
    livestock_aeu, poultry_aeu = animal_energy_units(geom)
    z.AEU = livestock_aeu / (area * ACRES_PER_SQM)
    z.n41j = livestock_aeu
    z.n41k = poultry_aeu
    z.n41l = livestock_aeu + poultry_aeu

    z.ManNitr, z.ManPhos = manure_spread(z.AEU)

    # Data from Streams dataset
    z.StreamLength = stream_length(geom)   # Meters
    z.n42b = round(z.StreamLength / 1000)  # Kilometers

    # Data from Point Source Discharge dataset
    n_load, p_load, discharge = point_source_discharge(geom, area)
    z.PointNitr = n_load
    z.PointPhos = p_load
    z.PointFlow = discharge

    # Data from National Weather dataset
    temps, prcps = weather_data(ws, z.WxYrBeg, z.WxYrEnd)
    z.Temp = temps
    z.Prec = prcps

    z.AgLength = geop_result['AgStreamPct'] * z.StreamLength
    z.UrbLength = z.StreamLength - z.AgLength

    z.CN = np.array(geop_result['CN'])
    z.SedPhos = geop_result['SedPhos']

    # TODO pass real input to model instead of reading it from gms file
    gms_filename = join(dirname(abspath(__file__)), 'data/sample_input.gms')
    gms_file = open(gms_filename, 'r')
    z = parser.GmsReader(gms_file).read()

    # The frontend expects an object with runoff and quality as keys.
    response_json = {'runoff': gwlfe.run(z)}

    return response_json


@shared_task(throws=Exception)
def nlcd_streams(sjs_result):
    """
    From a dictionary mapping NLCD codes to the count of stream pixels on
    each, return a dictionary with a key 'AgStreamPct' which indicates the
    percent of streams in agricultural areas, namely NLCD 81 Pasture/Hay
    and 82 Cultivated Crops.

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

    ag_streams = sum(result.get(nlcd, 0) for nlcd in [81, 82])
    total = sum(result.values())

    ag_stream_percent = ag_streams / total

    return {
        'AgStreamPct': ag_stream_percent
    }


@shared_task(throws=Exception)
def nlcd_soils(sjs_result):
    """
    Get Curve Number and Sediment Phosphorus from NLCD, Soil Group and Texture.

    Results are expected to be in the format:
    {
      (NLCD ID, Soil Group ID, Soil Texture ID): Count,
    }

    Curve Number is determined by calculating the average hydrological soil
    group for each land use type, rounded to the nearest integer, and looking
    up the value in the CURVE_NUMBER table in gwlfe_settings.

    Sediment Phosphorus has agricultural and non-agricultural values for each
    texture type in the SOILP table in gwlfe_settings. NLCD IDs 81 and 82 are
    considered agricultural, and the rest non-agricultural. We average each
    pairing to get the final value.
    """
    if 'error' in sjs_result:
        raise Exception('[nlcd_soils] {}'.format(sjs_result['error']))

    result = parse_sjs_result(sjs_result)

    def calc_cn(inputs):
        # We don't need Soil Texture to calculate Curve Number, so reduce the
        # inputs to disregard it. Also, since we use only a subset of
        # available soil groups, map each value to its subset value stored in
        # the SOIL_GROUP table in gwlfe_settings.

        # Reduce [(n, g, t): c] to [n: sum(c)] and [(n, g): sum(c)]
        n_count = {}
        ng_count = {}
        for (n, g, t) in inputs:
            # Map soil group values to usable subset
            g2 = settings.SOIL_GROUP[g]
            n_count[n] = inputs[(n, g, t)] + n_count.get(n, 0)
            ng_count[(n, g2)] = inputs[(n, g, t)] + ng_count.get((n, g2), 0)

        # Reduce [(n, g): c] to [n: avg(g * c)]
        n_gavg = {}
        for (n, g) in ng_count:
            n_gavg[n] = (float(g) * ng_count[(n, g)] / n_count[n] +
                         n_gavg.get(n, 0))

        def cni(nlcd):
            # Helper method to lookup values from CURVE_NUMBER table
            return settings.CURVE_NUMBER[nlcd][int(round(n_gavg.get(nlcd, 0)))]

        def cni_avg(xs):
            # Helper method to average non-zero values only
            vals = [cni(x) for x in xs]
            sum_vals = sum(vals)
            nonzero_vals = len([v for v in vals if v > 0])

            return sum_vals / nonzero_vals if nonzero_vals > 0 else 0

        return [
            cni(81),  # Hay/Pasture
            cni(82),  # Cropland
            cni_avg([41, 42, 43, 52]),  # Forest
            cni_avg([90, 95]),  # Wetland
            0,  # Disturbed
            0,  # Turf Grass
            cni_avg([21, 71]),  # Open Land
            cni_avg([12, 31]),  # Bare Rock
            0,  # Sandy Areas
            0,  # Unpaved Road
            0, 0, 0, 0, 0, 0  # Urban Land Use Types
        ]

    def calc_sedp(inputs):
        # Soil Concentration of Phosphorus
        ag_textures = {}
        nag_textures = {}
        total = sum(inputs.values())
        for (n, g, t) in inputs:
            if n in [81, 82]:
                ag_textures[t] = inputs[(n, g, t)] + ag_textures.get(t, 0)
            else:
                nag_textures[t] = inputs[(n, g, t)] + nag_textures.get(t, 0)

        ag_sedp = sum(count * settings.SOILP[t][0]
                      for t, count in ag_textures.iteritems())
        nag_sedp = sum(count * settings.SOILP[t][1]
                       for t, count in nag_textures.iteritems())

        return float(ag_sedp + nag_sedp) / total

    return {
        'CN': calc_cn(result),
        'SedPhos': calc_sedp(result)
    }


def geop_tasks(geom, errback):
    # List of tuples of (opname, data, callback) for each geop task
    definitions = [
        ('nlcd_streams',
         {'polygon': [geom.geojson], 'vector': streams(geom)},
         nlcd_streams),

        ('nlcd_soils', {'polygon': [geom.geojson]}, nlcd_soils),
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
