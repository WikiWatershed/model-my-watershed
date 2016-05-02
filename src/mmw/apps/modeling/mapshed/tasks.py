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
                                         stream_length,
                                         point_source_discharge,
                                         weather_data,
                                         )

ACRES_PER_SQM = 0.000247105


@shared_task
def collect_data(geojson):
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

    # TODO pass real input to model instead of reading it from gms file
    gms_filename = join(dirname(abspath(__file__)), 'data/sample_input.gms')
    gms_file = open(gms_filename, 'r')
    z = parser.GmsReader(gms_file).read()

    # The frontend expects an object with runoff and quality as keys.
    response_json = {'runoff': gwlfe.run(z)}

    return response_json


@shared_task
def start_gwlfe_job(model_input):
    geom = GEOSGeometry(json.dumps(model_input['area_of_interest']),
                        srid=4326)

    return collect_data.s(geom.geojson)
