# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import csv

from apps.bigcz.models import BBox

from django.conf import settings

from rest_framework import status
from rest_framework.exceptions import APIException
import dateutil.parser


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


class UnexpectedResponseError(APIException):
    status_code = 500
    default_detail = 'Unexpected response from data service provider.'


class RequestTimedOutError(APIException):
    status_code = 408
    default_detail = 'Requested resource timed out.'
    default_code = 'request_timeout'


class ValuesTimedOutError(APIException):
    status_code = status.HTTP_504_GATEWAY_TIMEOUT
    default_detail = \
        'Request for values did not finish in {} seconds'.format(
            settings.BIGCZ_CLIENT_TIMEOUT)


def read_unicode_csv(utf8_data, **kwargs):
    csv_reader = csv.DictReader(utf8_data, **kwargs)
    for row in csv_reader:
        yield {
            key.decode('utf-8'): value.decode('utf-8')
            for key, value in row.iteritems()
        }
