# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import math
import numpy as np

from collections import namedtuple

from gwlfe.enums import GrowFlag

from django.conf import settings
from django.db import connection

NUM_WEATHER_STATIONS = settings.GWLFE_CONFIG['NumWeatherStations']
MONTHS = settings.GWLFE_DEFAULTS['Month']


def day_lengths(geom):
    """
    Given a geometry in EPSG:4326, returns an array of 12 floats, each
    representing the average number of daylight hours at that geometry's
    centroid for each month.
    """
    latitude = geom.centroid[1]
    lengths = np.zeros(12)

    for month in range(12):
        # Magic formula taken from original MapShed source
        lengths[month] = 7.63942 * math.acos(0.43481 *
                                             math.tan(latitude * 0.017453) *
                                             math.cos(0.0172 *
                                                      (month * 30.4375 - 5)))

    return lengths


def nearest_weather_stations(geom, n=NUM_WEATHER_STATIONS):
    """
    Given a geometry, returns a list of the n closest weather stations to it
    """
    sql = '''
          SELECT station, location, meanrh, meanwind, meanprecip,
                 begyear, endyear, eroscoeff, rain_cool, rain_warm,
                 etadj, grw_start, grw_end
          FROM ms_weather_station
          ORDER BY geom <-> ST_SetSRID(ST_GeomFromText(%s), 4326)
          LIMIT %s;
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt, n])

        # Return all rows from cursor as namedtuple
        weather_station = namedtuple('WeatherStation',
                                     [col[0] for col in cursor.description])
        return [weather_station(*row) for row in cursor.fetchall()]


def growing_season(ws):
    """
    Given an array of weather stations, returns an array of 12 integers, each 1
    or 0, indicating whether it is a growing season or not respectively.
    We adopt a liberal approach, unioning the ranges to get a superset which is
    a growing season for any weather station.
    """

    start = min([MONTHS.index(w.grw_start) for w in ws])
    end = max([MONTHS.index(w.grw_end) for w in ws])

    season = [GrowFlag.NON_GROWING_SEASON] * 12
    season[start:end] = [GrowFlag.GROWING_SEASON] * (end - start)

    return season


def erosion_coeff(ws, season):
    """
    Given an array of weather stations and a growing season array, returns an
    array of 12 decimals, one for the erosion coefficient of each month. For
    months that are in the growing season, we average the `rain_warm` of both
    the weather stations, and for months outside the growing season, we average
    `rain_cool` instead.
    """

    avg_warm = np.mean([w.rain_warm for w in ws])
    avg_cool = np.mean([w.rain_cool for w in ws])

    return np.array([avg_warm if month == GrowFlag.GROWING_SEASON else avg_cool
                     for month in season])


def et_adjustment(ws):
    """
    Given an array of weather stations, returns an array of 12 decimals, one
    for the ET Adjustment of each month. We average the `etadj` of all weather
    stations, and use that value for all months.
    """

    avg_etadj = np.mean([w.etadj for w in ws])

    return np.array([avg_etadj] * 12)
