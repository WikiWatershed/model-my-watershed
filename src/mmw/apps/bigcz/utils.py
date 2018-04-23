# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import BBox

from rest_framework.exceptions import APIException
import dateutil.parser

from django.db import connection
from geopandas import GeoDataFrame


def get_huc_info(geom):
    op = '@'
    sql = '''select id,huc12,geom 
             from boundary_huc12 
             where geom {operator} st_setsrid(st_geomfromgeojson('{geom}'),4326)'''.format

    gdf = GeoDataFrame.from_postgis(sql(operator=op, geom=geom), connection, geom_col='geom')

    if len(gdf) == 0:
        op = '&&'
        gdf = GeoDataFrame.from_postgis(sql(operator=op, geom=geom), connection, geom_col='geom')

    return gdf


def parse_date(value):
    if not value:
        return None
    return dateutil.parser.parse(value)


def filter_aoi_intersection(aoi, results):
    """Only include results with no geometries, or geometries
    which intersect with the AoI from the provided results.

    Args:
        aoi (GEOSGeometry): Area of Interest to filter in
        results (ResultList): Collection of results to filter

    Returns:
        ResultList: the filtered set of results
    """
    aoip = aoi.prepared
    return [result for result in results if (result.geom is None or
                                             aoip.intersects(result.geom))]


def get_bounds(aoi):
    """Returns the bounding box of the GEOSGeometry

    Args:
        aoi (GEOSGeometry): Geometry for which to calculate bounds

    Returns:
        BBox of the supplied geometry
    """
    bounds = aoi.boundary.coords[0]
    x_coords = {coord[0] for coord in bounds}
    y_coords = {coord[1] for coord in bounds}

    return BBox(min(x_coords), min(y_coords), max(x_coords), max(y_coords))


class RequestTimedOutError(APIException):
    status_code = 408
    default_detail = 'Requested resource timed out.'
    default_code = 'request_timeout'
