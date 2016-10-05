# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.contrib.gis.geos import GEOSGeometry

from django.conf import settings
from django.db import connection

from apps.modeling.mapshed.calcs import (animal_energy_units,
                                         get_point_source_table)

DRB = settings.DRB_PERIMETER

ANIMAL_DISPLAY_NAMES = {
    'sheep': 'Sheep',
    'horses': 'Horses',
    'turkeys': 'Turkeys',
    'layers': 'Chickens, Layers',
    'beef_cows': 'Cows, Beef',
    'hogs': 'Pigs/Hogs/Swine',
    'dairy_cows': 'Cows, Dairy',
    'broilers': 'Chickens, Broilers',
}


def animal_population(geojson):
    """
    Given a GeoJSON shape, call MapShed's `animal_energy_units` method
    to calculate the area-weighted county animal population. Returns a
    dictionary to append to the outgoing JSON for analysis results.
    """
    geom = GEOSGeometry(geojson, srid=4326)
    aeu_for_geom = animal_energy_units(geom)[2]
    aeu_return_values = []

    for animal, aeu_value in aeu_for_geom.iteritems():
        aeu_return_values.append({
            'type': ANIMAL_DISPLAY_NAMES[animal],
            'aeu': int(aeu_value),
        })

    return {
        'displayName': 'Animals',
        'name': 'animals',
        'categories': aeu_return_values
    }


def point_source_pollution(geojson):
    """
    Given a GeoJSON shape, retrieve point source pollution data
    from the `ms_pointsource` or `ms_pointsource_drb table to display
    in the Analyze tab.

    Returns a dictionary to append to the outgoing JSON for analysis
    results.
    """
    geom = GEOSGeometry(geojson, srid=4326)
    drb = geom.within(DRB)
    table_name = get_point_source_table(drb)
    sql = '''
          SELECT city, state, npdes_id, mgd, kgn_yr, kgp_yr, latitude,
                 longitude, {facilityname}
          FROM {table_name}
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(%s), 4326))
          '''.format(facilityname='facilityname' if drb else 'null',
                     table_name=table_name)

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt])

        if cursor.rowcount != 0:
            columns = [col[0] for col in cursor.description]
            point_source_results = [
                dict(zip(columns,
                         [row[0], row[1], row[2],
                          float(row[3]) if row[3] else None,
                          float(row[4]) if row[4] else None,
                          float(row[5]) if row[5] else None,
                          float(row[6]) if row[6] else None,
                          float(row[7]) if row[7] else None,
                          row[8]]))
                for row in cursor.fetchall()
            ]
        else:
            point_source_results = []

    return {
        'displayName': 'Point Source',
        'name': 'pointsource',
        'categories': point_source_results
    }
