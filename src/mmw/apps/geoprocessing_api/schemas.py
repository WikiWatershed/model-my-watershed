# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from drf_yasg.openapi import (
    Parameter, Schema,
    IN_PATH, IN_QUERY,
    FORMAT_DATETIME, FORMAT_UUID,
    TYPE_ARRAY, TYPE_BOOLEAN, TYPE_NUMBER, TYPE_OBJECT, TYPE_STRING
)

from django.conf import settings

nlcd_year_allowed_values = [
    '2019_2019',
    '2019_2016',
    '2019_2011',
    '2019_2006',
    '2019_2001',
    '2011_2011',
]
NLCD_YEAR = Parameter(
    'nlcd_year',
    IN_PATH,
    description='The NLCD product version and target year to query.'
                ' Must be one of: "{}"'.format(
                    '", "'.join(nlcd_year_allowed_values)
                ),
    type=TYPE_STRING,
    required=True,
)

DRB_2100_LAND_KEY = Parameter(
    'key',
    IN_PATH,
    description='The DRB 2100 land dataset key to query.'
                ' Must be one of: "{}".'.format(
                    '", "'.join(settings.DREXEL_FAST_ZONAL_API['keys'])
                ),
    type=TYPE_STRING,
    required=True,
)

WKAOI = Parameter(
    'wkaoi',
    IN_QUERY,
    description='The table and ID for a well-known area of interest, '
                'such as a HUC. '
                'Format "table__id", eg. "huc12__55174" will analyze '
                'the HUC-12 City of Philadelphia-Schuylkill River.',
    type=TYPE_STRING,
)

MULTIPOLYGON = Schema(
    title='Area of Interest',
    description='A valid single-ringed Multipolygon GeoJSON '
                'representation of the shape to analyze. '
                'See the GeoJSON spec '
                'https://tools.ietf.org/html/rfc7946#section-3.1.7',
    type=TYPE_OBJECT,
    properties={
        'type': Schema(type=TYPE_STRING,
                       example='MultiPolygon'),
        'coordinates': Schema(type=TYPE_ARRAY,
                              items=Schema(
                                  type=TYPE_ARRAY,
                                  items=Schema(
                                      type=TYPE_ARRAY,
                                      items=Schema(
                                          type=TYPE_ARRAY,
                                          items=Schema(
                                              type=TYPE_NUMBER
                                          )))),
                              example=[[[
                                  [-75.16468, 39.97054],
                                  [-75.17086, 39.95001],
                                  [-75.14888, 39.95975],
                                  [-75.16468, 39.97054]]]])
    }
)

TOKEN_REQUEST = Schema(
    title='Token Request',
    type=TYPE_OBJECT,
    properties={
        'username': Schema(type=TYPE_STRING, example='username'),
        'password': Schema(type=TYPE_STRING, example='password'),
        'regenerate': Schema(type=TYPE_BOOLEAN, default=False),
    },
    required=['username', 'password']
)

TOKEN_RESPONSE = Schema(
    title='Token Response',
    type=TYPE_OBJECT,
    properties={
        'token': Schema(type=TYPE_STRING,
                        example='ea467ed7f67c53cfdd313198647a1d187b4d3ab9'),
        'created_at': Schema(type=TYPE_STRING, format=FORMAT_DATETIME,
                             example='2019-07-30T20:28:12.880Z'),
    }
)

DRB_2100_LAND_ERROR_RESPONSE = Schema(
    title='DRB 2100 Land Error Response',
    type=TYPE_OBJECT,
    properties={
        'errors': Schema(type=TYPE_ARRAY, items=Schema(type=TYPE_STRING),
                         example=['`key` must be specified',
                                  'The area of interest must be within the'
                                  ' Delaware River Basin.'])
    }
)

JOB_STARTED_RESPONSE = Schema(
    title='Job Started Response',
    type=TYPE_OBJECT,
    properties={
        'job': Schema(type=TYPE_STRING, format=FORMAT_UUID,
                      example='6e514e69-f46b-47e7-9476-c1f5be0bac01'),
        'status': Schema(type=TYPE_STRING, example='started'),
    }
)

JOB_RESPONSE = Schema(
    title='Job Response',
    type=TYPE_OBJECT,
    properties={
        'job_uuid': Schema(type=TYPE_STRING, format=FORMAT_UUID,
                           example='6e514e69-f46b-47e7-9476-c1f5be0bac01'),
        'status': Schema(type=TYPE_STRING, example='started'),
        'result': Schema(type=TYPE_OBJECT),
        'error': Schema(type=TYPE_STRING),
        'started': Schema(type=TYPE_STRING, format=FORMAT_DATETIME,
                          example='2019-07-30T20:28:12.880Z'),
        'finished': Schema(type=TYPE_STRING, format=FORMAT_DATETIME,
                           example='2019-07-30T20:28:12.880Z'),
    }
)

RWD_REQUEST = Schema(
    title='Rapid Watershed Delineation Request',
    type=TYPE_OBJECT,
    properties={
        'location': Schema(type=TYPE_ARRAY, items=Schema(type=TYPE_NUMBER),
                           example=[39.67185812402583, -75.76742706298828],
                           description='The point to delineate. '
                                       'Format is [lat, lng].'),
        'snappingOn': Schema(type=TYPE_BOOLEAN, default=True,
                             description='Snap to the nearest stream? '
                                         'Default is `false`.'),
        'simplify': Schema(type=TYPE_NUMBER,
                           example=0.0001,
                           description='Simplify tolerance for delineated '
                                       'watershed shape in response. Use `0` '
                                       'to receive an unsimplified shape. '
                                       'When this parameter is not supplied, '
                                       '`simplify` defaults to `0.0001` for '
                                       '"drb" and is a function of the '
                                       'shape\'s area for "nhd"'),
        'dataSource': Schema(type=TYPE_STRING, default='drb',
                             example='drb',
                             description='Which resolution to delineate with. '
                                         'Either "drb" to use Delaware High '
                                         'Resolution (10m) or "nhd" to use '
                                         'Continental US High Resolution '
                                         '(30m). Default is "drb". Points '
                                         'must be in the Delaware River Basin '
                                         'to use "drb", and in the '
                                         'Continental US to use "nhd"'),
    },
    required=['location'],
)
