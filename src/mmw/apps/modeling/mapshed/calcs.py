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
MONTHDAYS = settings.GWLFE_CONFIG['MonthDays']
LIVESTOCK = settings.GWLFE_CONFIG['Livestock']
POULTRY = settings.GWLFE_CONFIG['Poultry']
LITERS_PER_MGAL = 3785412
WEATHER_NULL = settings.GWLFE_CONFIG['WeatherNull']


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

        if cursor.rowcount == 0:
            raise Exception("No weather stations found.")

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


def animal_energy_units(geom):
    """
    Given a geometry, returns the total livestock and poultry AEUs within it
    """
    sql = '''
          WITH clipped_counties AS (
              SELECT ST_Intersection(geom,
                                     ST_SetSRID(ST_GeomFromText(%s),
                                                4326)) AS geom_clipped,
                     ms_county_animals.*
              FROM ms_county_animals
              WHERE ST_Intersects(geom,
                                  ST_SetSRID(ST_GeomFromText(%s),
                                             4326))
          ), clipped_counties_with_area AS (
              SELECT ST_Area(geom_clipped) / ST_Area(geom) AS clip_percent,
                     clipped_counties.*
              FROM clipped_counties
          )
          SELECT SUM(beef_ha * totalha * clip_percent) AS beef_cows,
                 SUM(broiler_ha * totalha * clip_percent) AS broilers,
                 SUM(dairy_ha * totalha * clip_percent) AS dairy_cows,
                 SUM(sheep_ha * totalha * clip_percent) AS sheep,
                 SUM(hog_ha * totalha * clip_percent) AS hogs,
                 SUM(horse_ha * totalha * clip_percent) AS horses,
                 SUM(layer_ha * totalha * clip_percent) AS layers,
                 SUM(turkey_ha * totalha * clip_percent) AS turkeys
          FROM clipped_counties_with_area;
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt, geom.wkt])

        # Convert result to dictionary
        columns = [col[0] for col in cursor.description]
        values = cursor.fetchone()  # Only one row since aggregate query
        aeu = dict(zip(columns, values))

        livestock_aeu = round(sum(aeu[animal] or 0 for animal in LIVESTOCK))
        poultry_aeu = round(sum(aeu[animal] or 0 for animal in POULTRY))

        return livestock_aeu, poultry_aeu


def manure_spread(aeu):
    """
    Given Animal Energy Units, returns two 16-item lists, containing nitrogen
    and phosphorus manure spreading values for each of the 16 land use types.
    If a given land use index is marked as having manure spreading applied in
    the configuration, it will have a value calculated below, otherwise it
    will be set to 0.
    """
    n_list = np.zeros(16)
    p_list = np.zeros(16)

    if 1.0 <= aeu:
        n_spread, p_spread = 4.88, 0.86
    elif 0.5 < aeu < 1.0:
        n_spread, p_spread = 3.66, 0.57
    else:
        n_spread, p_spread = 2.44, 0.38

    for lu in settings.GWLFE_CONFIG['ManureSpreadingLandUseIndices']:
        n_list[lu] = n_spread
        p_list[lu] = p_spread

    return n_list, p_list


def stream_length(geom, drb=False):
    """
    Given a geometry, finds the total length of streams in meters within it.
    If the drb flag is set, we use the Delaware River Basin dataset instead
    of NHD Flowline.
    """
    sql = '''
          SELECT ROUND(SUM(ST_Length(
              ST_Transform(
                  ST_Intersection(geom,
                                  ST_SetSRID(ST_GeomFromText(%s), 4326)),
                  5070))))
          FROM {datasource}
          WHERE ST_Intersects(geom,
                              ST_SetSRID(ST_GeomFromText(%s), 4326));
          '''.format(datasource='drb_streams_50' if drb else 'nhdflowline')

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt, geom.wkt])

        return cursor.fetchone()[0] or 0  # Aggregate query returns singleton


def point_source_discharge(geom, area):
    """
    Given a geometry and its area in square meters, returns three lists,
    each with 12 values, one for each month, containing the Nitrogen Load (in
    kg), Phosphorus Load (in kg), and Discharge (in liters per square meter)
    """
    sql = '''
          SELECT SUM(mgd) AS mg_d,
                 SUM(kgn_yr) / 12 AS kgn_month,
                 SUM(kgp_yr) / 12 AS kgp_month
          FROM ms_pointsource
          WHERE ST_Intersects(geom,
                              ST_SetSRID(ST_GeomFromText(%s), 4326));
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt])
        mg_d, kgn_month, kgp_month = cursor.fetchone()

        n_load = np.array([kgn_month] * 12) if kgn_month else np.zeros(12)
        p_load = np.array([kgp_month] * 12) if kgp_month else np.zeros(12)
        discharge = np.array([float(mg_d * days * LITERS_PER_MGAL) / area
                              for days in MONTHDAYS]) if mg_d else np.zeros(12)

        return n_load, p_load, discharge


def weather_data(ws, begyear, endyear):
    """
    Given a list of Weather Stations and beginning and end years, returns two
    3D arrays, one for average temperature and the other for precipitation,
    for each day in each month in each year in the range, averaged over all
    stations in the list, in the format:
        array[year][month][day] = value
    where `year` 0 corresponds to the first year in the range, 1 to the second,
    and so on; `month` 0 corresponds to January, 1 to February, and so on;
    `day` 0 corresponds to the 1st of the month, 1 to the 2nd, and so on. Cells
    with no corresponding values are marked as None.
    """
    temp_sql = '''
               SELECT year, EXTRACT(MONTH FROM TO_DATE(month, 'MON')) AS month,
                      AVG("1") AS "1", AVG("2") AS "2", AVG("3") AS "3",
                      AVG("4") AS "4", AVG("5") AS "5", AVG("6") AS "6",
                      AVG("7") AS "7", AVG("8") AS "8", AVG("9") AS "9",
                      AVG("10") AS "10", AVG("11") AS "11", AVG("12") AS "12",
                      AVG("13") AS "13", AVG("14") AS "14", AVG("15") AS "15",
                      AVG("16") AS "16", AVG("17") AS "17", AVG("18") AS "18",
                      AVG("19") AS "19", AVG("20") AS "20", AVG("21") AS "21",
                      AVG("22") AS "22", AVG("23") AS "23", AVG("24") AS "24",
                      AVG("25") AS "25", AVG("26") AS "26", AVG("27") AS "27",
                      AVG("28") AS "28", AVG("29") AS "29", AVG("30") AS "30",
                      AVG("31") AS "31"
               FROM ms_weather
               WHERE station IN %s
                 AND measure IN ('TMax', 'TMin')
                 AND year BETWEEN %s AND %s
               GROUP BY year, month
               ORDER BY year, month;
               '''
    prcp_sql = '''
               SELECT year, EXTRACT(MONTH FROM TO_DATE(month, 'MON')) AS month,
                     "1",  "2",  "3",  "4",  "5",  "6",  "7",  "8",  "9", "10",
                    "11", "12", "13", "14", "15", "16", "17", "18", "19", "20",
                    "21", "22", "23", "24", "25", "26", "27", "28", "29", "30",
                    "31"
               FROM ms_weather
               WHERE station IN %s
                 AND measure = 'Prcp'
                 AND year BETWEEN %s AND %s
               ORDER BY year, month;
               '''

    year_range = endyear - begyear + 1
    stations = tuple([w.station for w in ws])
    temps = np.zeros((year_range, 12, 31))
    prcps = np.zeros((year_range, 12, 31))

    with connection.cursor() as cursor:
        cursor.execute(temp_sql, [stations, begyear, endyear])
        for row in cursor.fetchall():
            year = row[0] - begyear
            month = row[1] - 1
            for day in range(31):
                t = row[day + 2]
                temps[year, month, day] = t if t != WEATHER_NULL else None

    with connection.cursor() as cursor:
        cursor.execute(prcp_sql, [stations, begyear, endyear])
        for row in cursor.fetchall():
            year = row[0] - begyear
            month = row[1] - 1
            for day in range(31):
                p = row[day + 2]
                prcps[year, month, day] = p if p != WEATHER_NULL else None

    return temps, prcps
