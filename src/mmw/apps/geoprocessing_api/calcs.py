# -*- coding: utf-8 -*-
import json
import requests
from operator import itemgetter

from django.contrib.gis.geos import GEOSGeometry

from django.conf import settings
from django.db import connection

from shapely.geometry import box, shape

from apps.modeling.mapshed.calcs import (animal_energy_units,
                                         get_point_source_table)

DRB = settings.PERIMETERS['DRB_SIMPLE']['geom']

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


def get_albers_crs_for_aoi(aoi):
    """
    Return the Albers Equal Area Projection for the given AoI

    Since we want to calculate area, we need to use an Equal Area projection,
    but this differs based on where you are in the globe. We use rough bounding
    boxes to see if the shape neatly fits within one of the continents. If not,
    we fall back to a global approximation.
    """

    if aoi.within(box(-170, 15, -50, 75)):  # North America
        return 'EPSG:5070'
    elif aoi.within(box(-10, 34, 40, 72)):  # Europe
        return 'EPSG:3035'
    elif aoi.within(box(25, -10, 180, 60)):  # Asia
        return 'ESRI:102025'
    elif aoi.within(box(-20, -35, 55, 38)):  # Africa
        return 'ESRI:102022'
    elif aoi.within(box(-90, -60, -30, 15)):  # South America
        return 'ESRI:102033'
    elif aoi.within(box(112, -45, 155, -10)):  # Australia
        return 'ESRI:102034'
    else:  # Global
        return 'ESRI:54017'  # Behrmann Equal Area Cylindrical


def animal_population(geojson):
    """
    Given a GeoJSON shape, call MapShed's `animal_energy_units` method
    to calculate the area-weighted county animal population. Returns a
    dictionary to append to the outgoing JSON for analysis results.
    """
    geom = GEOSGeometry(geojson, srid=4326)
    aeu_for_geom = animal_energy_units(geom)[2]
    aeu_return_values = []

    for animal, aeu_value in aeu_for_geom.items():
        aeu_return_values.append({
            'type': ANIMAL_DISPLAY_NAMES[animal],
            'aeu': int(aeu_value),
        })

    return {
        'displayName': 'Animals',
        'name': 'animals',
        'categories': aeu_return_values
    }


def stream_data(results, geojson, datasource='nhdhr'):
    """
    Given a GeoJSON shape, retreive stream data from the specified table
    to display in the Analyze tab

    Returns a dictionary to append to outgoing JSON for analysis results.
    """

    NULL_SLOPE = -9998.0

    if datasource not in settings.STREAM_TABLES:
        raise Exception(f'Invalid stream datasource {datasource}')

    aoi = shape(json.loads(geojson))
    dst_proj = int(get_albers_crs_for_aoi(aoi)[5:])

    sql = f'''
        WITH stream_intersection AS (
            SELECT ST_Length(ST_Transform(
                      CASE
                        WHEN ST_CoveredBy(geom,
                                          ST_SetSRID(ST_GeomFromGeoJSON(%s),
                                                     4326))
                        THEN geom
                        ELSE ST_Intersection(geom,
                                             ST_SetSRID(ST_GeomFromGeoJSON(%s),
                                                        4326))
                      END,
                      {dst_proj})) AS lengthm,
                   stream_order,
                   slope
            FROM {settings.STREAM_TABLES[datasource]}
            WHERE ST_Intersects(geom,
                                ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)))

        SELECT SUM(lengthm) / 1000 AS lengthkm,
               stream_order,
               SUM(lengthm * NULLIF(slope, {NULL_SLOPE})) / 1000 AS slopesum
        FROM stream_intersection
        GROUP BY stream_order;
        '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geojson, geojson, geojson])

        if cursor.rowcount:
            columns = [col[0] for col in cursor.description]
            streams = [
                dict(zip(columns,
                         [
                             float(row[0]) if row[0] else 0,
                             int(row[1]) if row[1] and row[1] != 0 else 999,
                             float(row[2]) if row[2] else None,
                         ]))
                for row in cursor.fetchall()
            ]
        else:
            streams = []

    def calculate_avg_slope(slope, length):
        if slope and length:
            return slope / length
        return None

    stream_data = {
        str(s['stream_order']): {
            "order": s['stream_order'],
            "lengthkm": s['lengthkm'],
            "ag_stream_pct": results['ag_stream_pct'],
            "total_weighted_slope": s['slopesum'],
            "avgslope": calculate_avg_slope(s['slopesum'], s['lengthkm']),
        } for s in streams
    }

    # Add stream orders missing from query result
    for x in list(range(1, 11)) + [999]:
        stream_data.setdefault(str(x), {
            "order": x,
            "lengthkm": 0,
            "ag_stream_pct": results['ag_stream_pct'],
            "avgslope": None,
            "total_weighted_slope": None,
        })

    return {
        'displayName': 'Streams',
        'name': f'streams_{datasource}',
        'categories': sorted(list(stream_data.values()),
                             key=itemgetter('order')),
    }


def point_source_pollution(geojson):
    """
    Given a GeoJSON shape, retrieve point source pollution data
    from the `ms_pointsource` or `ms_pointsource_drb` table to display
    in the Analyze tab.

    Returns a dictionary to append to the outgoing JSON for analysis
    results.
    """
    geom = GEOSGeometry(geojson, srid=4326)
    drb = geom.within(DRB)
    table_name = get_point_source_table(drb)
    sql = f'''
          SELECT city, state, npdes_id, mgd, kgn_yr, kgp_yr, latitude,
                 longitude, {'facilityname' if drb else 'null'}
          FROM {table_name}
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(%s), 4326))
          '''

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


def catchment_water_quality(geojson):
    """
    Given a GeoJSON shape, retrieve Catchment Water Quality data
    from the `drb_catchment_water_quality` table to display
    in the Analyze tab.

    Returns a dictionary to append to the outgoing JSON for analysis
    result
    """
    geom = GEOSGeometry(geojson, srid=4326)
    table_name = 'drb_catchment_water_quality'
    sql = f'''
          SELECT nord, areaha, tn_tot_kgy, tp_tot_kgy, tss_tot_kg,
          tn_urban_k, tn_riparia, tn_ag_kgyr, tn_natural, tn_pt_kgyr,
          tp_urban_k, tp_riparia, tp_ag_kgyr, tp_natural, tp_pt_kgyr,
          tss_urban_, tss_rip_kg, tss_ag_kgy, tss_natura,
          tn_yr_avg_, tp_yr_avg_, tss_concmg,
          ST_AsGeoJSON(ST_Simplify(geom, 0.0003)) as geom
          FROM {table_name}
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromText(%s), 4326))
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geom.wkt])

        if cursor.rowcount != 0:
            columns = [col[0] for col in cursor.description]
            catchment_water_quality_results = [
                # The TN, TP, and TSS values return as type Decimal,
                # but we want floats.  For geom (22), we want a JSON object
                dict(zip(columns,
                         ([int(row[0]) if row[0] else None] +
                          [float(value) if value else None
                           for value in row[1:22]] +
                          [json.loads(row[22])])))
                for row in cursor.fetchall()
            ]
        else:
            catchment_water_quality_results = []

    # Create a reprojected version of the input geometry in order to check the
    # amount of intersection with the water quality catchment geoms.
    reprojected_aoi_geom = geom.transform(5070, clone=True)

    adjusted_wq_results = [r for r in catchment_water_quality_results if
                           catchment_intersects_aoi(reprojected_aoi_geom,
                                                    r['geom'])]

    return {
        'displayName': 'Water Quality',
        'name': 'catchment_water_quality',
        'categories': adjusted_wq_results
    }


def catchment_intersects_aoi(aoi, catchment):
    """Check whether a catchment geometry intersects an area of interest by
    more than a minimum value.

    Args:
        aoi (GEOSGeometry): The area of interest as a GEOSGeometry in 5070
        catchment (dict): The catchment geometry as Python dictionary

    Returns:
        bool: True if intersection area's > than min value; False otherwise

    This is done to ensure that we don't include catchments which 'intersect'
    only by abutting the area of interest (& not overlapping). We include
    catchments for which the intersection area represents either greater than
    some percentage of the catchment's area or greater than some percentage of
    the AOI's area.

    Minimum intersection percentages is a clamped scale between 0.1% and 5%
    depending on the size of the AOI: it's set as the AOI's area in sq km / by
    1000 up to a maximum of 5% (with a minimum of 0.1%). This is done because
    some analyzable AOIs have areas orders of magnitude larger than catchments,
    which means that even a tiny intersection area can represent a huge
    percentage of the catchment's area.

    As an additional guard, we also check that the sum of the catchment's
    intersection percentage and the area of interest's intersection percentage
    is greater than a `min_summed_intersection_pct`, set to 2%.
    """
    catchment_geom = GEOSGeometry(json.dumps(catchment), srid=4326)
    reprojected_catchment = catchment_geom.transform(5070, clone=True)

    if catchment_geom.area == 0:
        return True
    elif reprojected_catchment.area == 0:
        return True
    elif aoi.area == 0:
        return False
    elif not reprojected_catchment.valid:
        return False

    aoi_kms = aoi.area / 1000000
    min_intersection_pct = min(5, max(0.1, aoi_kms / 1000))
    min_summed_intersection_pct = 2

    intersection_area = reprojected_catchment.intersection(aoi).area

    catchment_intersection_pct = ((intersection_area /
                                  reprojected_catchment.area) * 100)

    aoi_intersection_pct = ((intersection_area / aoi.area) * 100)

    include_catchment = ((aoi_intersection_pct > min_intersection_pct or
                         catchment_intersection_pct > min_intersection_pct) and
                         aoi_intersection_pct + catchment_intersection_pct >
                         min_summed_intersection_pct)

    return include_catchment


def huc12s_with_aois(geojson):
    """
    Get list of HUC-12s and clipped AoIs for the given GeoJSON.

    Finds all HUC-12s the given GeoJSON intersects with, and for each
    matching one, returns a tuple of the HUC-12 shape and the GeoJSON
    clipped to that HUC-12, with the name and wkaoi of the HUC-12.
    """
    sql = '''
          SELECT ST_AsGeoJSON(geom_detailed) AS huc12_geom,
                 name,
                 ('huc12__' || id) AS wkaoi,
                 ST_AsGeoJSON(ST_Multi(ST_Intersection(
                     geom_detailed, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326)
                 ))) AS aoi_geom,
                 huc12
          FROM boundary_huc12
          WHERE ST_Intersects(geom_detailed,
                              ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
          '''

    matches = []
    with connection.cursor() as cursor:
        cursor.execute(sql, [geojson, geojson])

        if cursor.rowcount > 0:
            matches = [{
                'huc12_geom': row[0],
                'name': row[1],
                'wkaoi': row[2],
                'aoi_geom': row[3],
                'huc12': row[4],
            } for row in cursor.fetchall()]

    return matches


def streams_for_huc12s(huc12s, datasource='nhdhr'):
    """
    Get MultiLineString of all streams in the given HUC-12s
    """
    if datasource not in settings.STREAM_TABLES:
        raise Exception(f'Invalid stream datasource {datasource}')

    sql = f'''
          SELECT ST_AsGeoJSON(ST_Multi(s.geom))
          FROM {settings.STREAM_TABLES[datasource]} s
            INNER JOIN boundary_huc12 b
            ON ST_Intersects(s.geom, b.geom_detailed)
          WHERE b.huc12 IN %s
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [tuple(huc12s)])

        return [row[0] for row in cursor.fetchall()]  # List of GeoJSON strings


def drexel_fast_zonal(geojson, key):
    payload = '{{"geom": {}, "rasters": ["{}"]}}'.format(geojson, key)

    res = requests.post(settings.DREXEL_FAST_ZONAL_API['url'], data=payload)

    # Raise any non-success responses as exceptions, indicating failure
    res.raise_for_status()

    # Select results for the given key
    result = {int(k): v for k, v in res.json()[key].items()}

    return result


def huc12s_for_huc(huc):
    """
    Given a HUC code, returns a list of all HUC-12s starting with it.

    This will effectively give a list of all HUC-12s within a HUC-8 or HUC-10,
    given those codes. If a HUC-12 code is given, will return a singleton list.
    If no HUC-12s are found, returns an empty list.
    """
    sql = '''
          SELECT 'huc12__' || id, huc12, ST_AsGeoJSON(geom_detailed)
          FROM boundary_huc12
          WHERE huc12 LIKE %s
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [f'{huc}%'])
        return cursor.fetchall()


def huc12_for_point(point):
    """
    Given a point, returns a HUC-12 that contains it.

    Raises an error if the point is not contained in any HUC-12.
    """
    sql = '''
          SELECT
            ST_AsGeoJSON(geom_detailed) AS area_of_interest,
            ('huc12__' || id) AS wkaoi
          FROM boundary_huc12
          WHERE ST_Contains(geom, ST_GeomFromGeoJSON(%s))
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [point.geojson])
        return cursor.fetchone()


def tdx_watershed_for_point(point):
    """
    Given a point, returns a watershed that is calculated from the
    TDX Basins dataset for it. We first identify the basin the point is in,
    then find all basins with a lower discover time and a higher finish time,
    then union them to make the final watershed.

    For a full account of this algorithm, see:
    https://github.com/WikiWatershed/global-hydrography/?tab=readme-ov-file#modified-nested-set-index  # NOQA
    """
    lat, lng = point
    sql = '''
          WITH target AS (
            SELECT *
            FROM tdxbasins
            WHERE ST_Intersects(geom, ST_SetSRID(ST_Point(%s, %s), 4326))
          )

          SELECT json_build_object(
            'type', 'Feature',
            'properties', '{}'::json,
            'geometry', ST_AsGeoJSON(ST_Union(geom))::json
          )
          FROM tdxbasins
          WHERE root_id = (SELECT root_id FROM target)
            AND discover_time <= (SELECT discover_time FROM target)
            AND finish_time >= (SELECT finish_time FROM target)
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [lng, lat])
        return cursor.fetchone()[0]
