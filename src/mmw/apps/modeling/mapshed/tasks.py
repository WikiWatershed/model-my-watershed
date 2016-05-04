# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from os.path import join, dirname, abspath
from ast import literal_eval as make_tuple

from celery import shared_task

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
        sjs_result = sjs_retrieve(retry=self.retry, **incoming)

        # Convert string "List(1,2,3)" into tuple (1,2,3) for each key
        return {make_tuple(key[4:]): val for key, val in sjs_result.items()}

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

    # TODO pass real input to model instead of reading it from gms file
    gms_filename = join(dirname(abspath(__file__)), 'data/sample_input.gms')
    gms_file = open(gms_filename, 'r')
    z = parser.GmsReader(gms_file).read()

    # The frontend expects an object with runoff and quality as keys.
    response_json = {'runoff': gwlfe.run(z)}

    return response_json


@shared_task(throws=Exception)
def nlcd_streams(result):
    if 'error' in result:
        raise Exception('[nlcd_streams] {}'.format(result['error']))

    ag_streams = sum(result.get(nlcd, 0) for nlcd in [81, 82])
    total = sum(result.values())

    ag_stream_percent = ag_streams / total

    return {
        'AgStreamPct': ag_stream_percent
    }


def geop_tasks(geom, errback):
    # List of tuples of (opname, data, callback) for each geop task
    definitions = [
        ('nlcd_streams',
         {'polygon': [geom.geojson], 'vector': streams(geom)},
         nlcd_streams),
        # TODO Remove this second dummy call with actual geop task
        # We need at least two for the flatten to work correctly.
        ('nlcd_streams',
         {'polygon': [geom.geojson], 'vector': streams(geom)},
         nlcd_streams)
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
