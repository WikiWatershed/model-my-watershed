# -*- coding: utf-8 -*-
from drf_yasg.openapi import (
    Parameter, Schema,
    IN_PATH,
    FORMAT_DATETIME, FORMAT_UUID,
    TYPE_ARRAY, TYPE_BOOLEAN, TYPE_NUMBER, TYPE_OBJECT, TYPE_STRING
)

from django.conf import settings

from apps.core.models import JobStatus

STREAM_DATASOURCE = Parameter(
    'datasource',
    IN_PATH,
    description='The stream datasource to query.'
                ' Must be one of: "{}"'.format(
                    '", "'.join(settings.STREAM_TABLES.keys())),
    type=TYPE_STRING,
    required=True,
)

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
        'job_uuid': Schema(type=TYPE_STRING, format=FORMAT_UUID,
                           example='6e514e69-f46b-47e7-9476-c1f5be0bac01'),
        'status': Schema(type=TYPE_STRING, example=JobStatus.STARTED),
        'messages': Schema(type=TYPE_ARRAY, items=Schema(type=TYPE_STRING),
                           description='Optional messages provided by the API,'
                                       ' e.g. deprecation notices, etc.')
    }
)

JOB_RESPONSE = Schema(
    title='Job Response',
    type=TYPE_OBJECT,
    properties={
        'job_uuid': Schema(type=TYPE_STRING, format=FORMAT_UUID,
                           example='6e514e69-f46b-47e7-9476-c1f5be0bac01'),
        'status': Schema(type=TYPE_STRING, example=JobStatus.STARTED),
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

GLOBAL_RWD_REQUEST = Schema(
    title='Global Rapid Watershed Delineation Request',
    type=TYPE_OBJECT,
    properties={
        'location': Schema(type=TYPE_ARRAY, items=Schema(type=TYPE_NUMBER),
                           example=[39.67185812402583, -75.76742706298828],
                           description='The point to delineate. '
                                       'Format is [lat, lng].'),
    },
    required=['location'],
)

nlcd_override_allowed_values = '", "'.join([
    'nlcd-2019-30m-epsg5070-512-uint8raw',
    'nlcd-2016-30m-epsg5070-512-uint8raw',
    'nlcd-2011-30m-epsg5070-512-uint8raw',
    'nlcd-2006-30m-epsg5070-512-uint8raw',
    'nlcd-2001-30m-epsg5070-512-uint8raw',
    'nlcd-2011-30m-epsg5070-512-int8',
])
LAYER_OVERRIDES = Schema(
    title='Layer Overrides',
    type=TYPE_OBJECT,
    description='MMW combines different datasets in model runs. These have '
                'default values, but can be overridden by specifying them '
                'here. Only specify a value for the layers you want to '
                'override.',
    properties={
        '__LAND__': Schema(
            type=TYPE_STRING,
            example='nlcd-2019-30m-epsg5070-512-uint8raw',
            description='The NLCD layer to use. Valid options are: '
                        f'"{nlcd_override_allowed_values}". All "-uint8raw" '
                        'layers are from the NLCD19 product. The "-int8" '
                        'layer is from the NLCD11 product. The default value '
                        'is NLCD19 2019 "nlcd-2019-30m-epsg5070-512-uint8raw".'
        ),
        '__STREAMS__': Schema(
            type=TYPE_STRING,
            example='nhdhr',
            description='The streams layer to use. Valid options are: '
                        '"nhdhr" for NHD High Resolution Streams, "nhd" for '
                        'NHD Medium Resolution Streams, and "drb" for '
                        'Delaware High Resolution. The area of interest must '
                        'be completely within the Delaware River Basin for '
                        '"drb". "nhdhr" and "nhd" can be used within the '
                        'Continental United States. In some cases, "nhdhr" '
                        'may timeout. In such cases, "nhd" can be used as a '
                        'fallback. "nhdhr" is the default.'
        )
    },
)

WKAOI = Schema(
    title='Well-Known Area of Interest',
    type=TYPE_STRING,
    example='huc12__55174',
    description='The table and ID for a well-known area of interest, '
                'such as a HUC. '
                'Format "table__id", eg. "huc12__55174" will analyze '
                'the HUC-12 City of Philadelphia-Schuylkill River.',
)

HUC = Schema(
    title='Hydrologic Unit Code',
    type=TYPE_STRING,
    example='020402031008',
    description='The Hydrologic Unit Code (HUC) of the area of '
                'interest. Should be an 8, 10, or 12 digit string of '
                'numbers, e.g. "020402031008" will analyze the HUC-12 '
                'City of Philadelphia-Schuylkill River.',
)

ANALYZE_REQUEST = Schema(
    title='Analyze Request',
    type=TYPE_OBJECT,
    properties={
        'area_of_interest': MULTIPOLYGON,
        'wkaoi': WKAOI,
        'huc': HUC,
    },
)

MODELING_REQUEST = Schema(
    title='Modeling Request',
    type=TYPE_OBJECT,
    properties={
        'area_of_interest': MULTIPOLYGON,
        'wkaoi': WKAOI,
        'huc': HUC,
        'layer_overrides': LAYER_OVERRIDES,
    },
)

GWLFE_MODIFICATIONS = Schema(
    type=TYPE_ARRAY,
    items=Schema(type=TYPE_OBJECT),
    description='An optional list of objects each overriding the GWLF-E input '
                'object. An object in the array should have keys that either '
                'match a key in the GWLF-E input, or be in the format '
                'KEY__INDEX, where KEY corresponds to an array key in the '
                'GWLF-E input, and the INDEX corresponds to the index in that '
                'array to modify. The value of the modification is the one '
                'that will be used. Modifications are applied in order, so '
                'later ones will override earlier ones. This is particularly '
                'useful when the input is provided as job_uuid rather than an '
                'object. e.g. [{ "n26": 88.8, "CN__1": 80.3 }]'
)

INPUTMOD_HASH = Schema(
    type=TYPE_STRING,
    description='An optional string to uniquely represent the contents of the '
                'input and the modifications, usually a hash of them. It is '
                'included as is in the result, and can be used '
)

GWLFE_REQUEST = Schema(
    title='GWLF-E Request',
    type=TYPE_OBJECT,
    properties={
        'input': Schema(
            type=TYPE_OBJECT,
            description='The result of modeling/gwlf-e/prepare/',
        ),
        'job_uuid': Schema(
            type=TYPE_STRING,
            format=FORMAT_UUID,
            example='6e514e69-f46b-47e7-9476-c1f5be0bac01',
            description='The job uuid of modeling/gwlf-e/prepare/',
        ),
        'modifications': GWLFE_MODIFICATIONS,
        'inputmod_hash': INPUTMOD_HASH,
    },
)

SUBBASIN_REQUEST = Schema(
    title='Subbasin Request',
    type=TYPE_OBJECT,
    properties={
        'wkaoi': WKAOI,
        'huc': HUC,
        'layer_overrides': LAYER_OVERRIDES,
    },
)

SUBBASIN_RUN_REQUEST = Schema(
    title='Subbasin Run Request',
    type=TYPE_OBJECT,
    properties={
        'job_uuid': Schema(
            type=TYPE_STRING,
            format=FORMAT_UUID,
            example='6e514e69-f46b-47e7-9476-c1f5be0bac01',
            description='The job uuid of modeling/subbasin/prepare/',
        ),
        'modifications': GWLFE_MODIFICATIONS,
        'inputmod_hash': INPUTMOD_HASH,
    },
    required=['job_uuid'],
)

POINTSOURCE_DATASOURCE = Parameter(
    'datasource',
    IN_PATH,
    description='MMW retrieves pointsource data from one of'
                ' three datasets depending on area of interest.'
                ' A datasource can be overridden if available for'
                ' a given area of interest, if specified in path.'
                ' Must be one of: "{}"'.format(
                    '", "'.join(settings.POINT_SOURCES.keys())),
    type=TYPE_STRING,
    required=True,
)

POINTSOURCE_ERROR_RESPONSE = Schema(
    title='Point Source Analysis Error Response',
    type=TYPE_OBJECT,
    properties={
        'errors': Schema(type=TYPE_ARRAY, items=Schema(type=TYPE_STRING),
                         example=['Invalid datasource requested',
                                  'The area of interest must be within the'
                                  ' Delaware River Basin.'])
    }
)
