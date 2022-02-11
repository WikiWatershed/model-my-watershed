# -*- coding: utf-8 -*-
from celery import chain

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.authentication import (TokenAuthentication,
                                           SessionAuthentication)
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.authtoken.models import Token
from drf_yasg.utils import swagger_auto_schema

from django.conf import settings
from django.utils.timezone import now
from django.urls import reverse
from django.contrib.gis.geos import GEOSGeometry

from apps.core.models import Job
from apps.core.tasks import (save_job_error,
                             save_job_result)
from apps.core.decorators import log_request
from apps.modeling import geoprocessing
from apps.modeling.mapshed.calcs import streams
from apps.modeling.mapshed.tasks import (collect_data,
                                         convert_data,
                                         multi_mapshed,
                                         nlcd_streams)
from apps.modeling.serializers import AoiSerializer
from apps.modeling.views import _parse_input as _parse_modeling_input

from apps.geoprocessing_api import schemas, tasks
from apps.geoprocessing_api.permissions import AuthTokenSerializerAuthentication  # noqa
from apps.geoprocessing_api.throttling import (BurstRateThrottle,
                                               SustainedRateThrottle)

from apps.geoprocessing_api.validation import validate_rwd


@swagger_auto_schema(method='post',
                     request_body=schemas.TOKEN_REQUEST,
                     responses={200: schemas.TOKEN_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((AuthTokenSerializerAuthentication,
                                    SessionAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
def get_auth_token(request, format=None):
    """
    Get your API key


    ## Request Body

    **Required**

    `username` (`string`): Your username

    `password` (`string`): Your password


    **Optional**

    `regenerate` (`boolean`): Regenerate your API token?
                              Default is `false`.

    **Example**

        {
            "username": "your_username",
            "password": "your_password"
        }

    ## Sample Response

        {
           "token": "ea467ed7f67c53cfdd313198647a1d187b4d3ab9",
           "created_at": "2017-09-11T14:50:54.738Z"
        }
    """

    should_regenerate = request.data.get('regenerate', False)
    if should_regenerate:
        Token.objects.filter(user=request.user).delete()

    token, created = Token.objects.get_or_create(user=request.user)
    return Response({'token': token.key,
                     'created_at': token.created})


@swagger_auto_schema(method='post',
                     request_body=schemas.RWD_REQUEST,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_rwd(request, format=None):
    """
    Starts a job to run Rapid Watershed Delineation on a point-based location.

    Selects the nearest downhill point on the medium resolution flow lines of
    either the Delaware River Basin high resolution stream network or the
    National Hydrography Dataset (NHDplus v2). The watershed area upstream of
    this point is automatically delineated using the 10m resolution national
    elevation model or the 30m resolution flow direction grid.

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#delineate-watershed).  # NOQA

    ## Request Body

    **Required**

    `location` (`array[number]`): The point to delineate.
    Format is `[lat, lng]`

    **Optional**

    `dataSource` (`string`): Which resolution to delineate with. Either
                  "drb" to use Delaware High Resolution (10m)
                  or "nhd" to use Continental US High Resolution (30m).
                  Default is "drb". Points must be in the Delaware River
                  Basin to use "drb", and in the Continental US to use "nhd"

    `snappingOn` (`boolean`): Snap to the nearest stream? Default is false

    `simplify` (`number`): Simplify tolerance for delineated watershed shape in
                response. Use `0` to receive an unsimplified shape. When this
                parameter is not supplied, `simplify` defaults to `0.0001` for
                "drb" and is a function of the shape's area for "nhd".

    **Example**

        {
            "location": [39.67185812402583,-75.76742706298828],
            "snappingOn": true,
            "simplify": 0,
            "dataSource":"nhd"
        }

    ## Response

    You can use the URL provided in the response's `Location` header
    to poll for the job's results.

    <summary>
        **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "watershed": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "geometry": {
                            "type": "Polygon",
                            "coordinates": [
                                [
                                    [
                                        -75.24776,
                                        39.98166
                                    ],
                                    [
                                        -75.24711,
                                        39.98166
                                    ]
                                ], ...
                            ]
                        },
                        "type": "Feature",
                        "properties": {
                            "Avgslp": 0.053271397948265,
                            "BasinLen": 0.596192138671875,
                            "RR": 0.022393757477403,
                            "Area": 0.06322861,
                            "AvgOLF": 0.10568827427475,
                            "DrnDen": 4.730893785815718,
                            "BR": 13.350982666015625,
                            "Strord": 1,
                            "StrLen": 0.299127838134766,
                            "GRIDCODE": 1
                        }
                    }
                ]
            },
            "input_pt": {
                "type": "FeatureCollection",
                "features": [
                    {
                        "geometry": {
                            "type": "Point",
                            "coordinates": [
                                -75.24938,
                                39.97875
                            ]
                        },
                        "type": "Feature",
                        "properties": {
                            "Lat": 39.978697,
                            "Dist_moved": 1,
                            "Lon": -75.24931,
                            "ID": 1
                        }
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    created = now()

    location = request.data.get('location')
    data_source = request.data.get('dataSource', 'drb')
    snapping = request.data.get('snappingOn', False)
    simplify = request.data.get('simplify', False)

    validate_rwd(location, data_source, snapping, simplify)

    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_rwd_job_chain(location, snapping, simplify,
                                        data_source, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        },
        headers={'Location': reverse('geoprocessing_api:get_job',
                                     args=[task_list.id])}
    )


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.NLCD_YEAR,
                                        schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_land(request, nlcd_year, format=None):
    """
    Starts a job to produce a land-use histogram for a given area and year.

    Supports the years 2019, 2016, 2011, 2006, and 2001 from the NLCD 2019
    product. Also supports the year 2011 from the NLCD 2011 product, which
    used to be the default previously.

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage).  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Land Use/Cover 2019 (NLCD19)",
                "name": "land_2019_2019",
                "categories": [
                    {
                        "nlcd": 43,
                        "code": "mixed_forest",
                        "type": "Mixed Forest",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 71,
                        "code": "grassland",
                        "type": "Grassland/Herbaceous",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 41,
                        "code": "deciduous_forest",
                        "type": "Deciduous Forest",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 42,
                        "code": "evergreen_forest",
                        "type": "Evergreen Forest",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 11,
                        "code": "open_water",
                        "type": "Open Water",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 12,
                        "code": "perennial_ice",
                        "type": "Perennial Ice/Snow",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 81,
                        "code": "pasture",
                        "type": "Pasture/Hay",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 82,
                        "code": "cultivated_crops",
                        "type": "Cultivated Crops",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 52,
                        "code": "shrub",
                        "type": "Shrub/Scrub",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 21,
                        "code": "developed_open",
                        "type": "Developed, Open Space",
                        "coverage": 0.030303030303030304,
                        "area": 2691.709835265247,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 22,
                        "code": "developed_low",
                        "type": "Developed, Low Intensity",
                        "coverage": 0.18181818181818182,
                        "area": 16150.259011591483,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 23,
                        "code": "developed_med",
                        "type": "Developed, Medium Intensity",
                        "coverage": 0.5151515151515151,
                        "area": 45759.0671995092,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 24,
                        "code": "developed_high",
                        "type": "Developed, High Intensity",
                        "coverage": 0.2727272727272727,
                        "area": 24225.388517387222,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 90,
                        "code": "woody_wetlands",
                        "type": "Woody Wetlands",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 95,
                        "code": "herbaceous_wetlands",
                        "type": "Emergent Herbaceous Wetlands",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    },
                    {
                        "nlcd": 31,
                        "code": "barren_land",
                        "type": "Barren Land (Rock/Sand/Clay)",
                        "coverage": 0,
                        "area": 0,
                        "active_river_area": 0
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    geop_input = {'polygon': [area_of_interest]}

    layer_overrides = {}
    if nlcd_year == '2011_2011':
        layer_overrides['__LAND__'] = 'nlcd-2011-30m-epsg5070-512-int8'

    nlcd, year = nlcd_year.split('_')
    if nlcd == '2019' and year in ['2019', '2016', '2011', '2006', '2001']:
        layer_overrides['__LAND__'] = f'nlcd-{year}-30m-epsg5070-512-byte'

    return start_celery_job([
        geoprocessing.run.s('nlcd_ara', geop_input, wkaoi,
                            layer_overrides=layer_overrides),
        tasks.analyze_nlcd.s(area_of_interest, nlcd_year)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_soil(request, format=None):
    """
    Starts a job to produce a soil-type histogram for a given area.

    Uses the Hydrologic Soil Groups From USDA gSSURGO 2016

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage).  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Soil",
                "name": "soil",
                "categories": [
                    {
                        "code": "a",
                        "type": "A - High Infiltration",
                        "coverage": 0.000010505194818837915,
                        "area": 897.253981351988
                    },
                    {
                        "code": "b",
                        "type": "B - Moderate Infiltration",
                        "coverage": 0.036474036411005245,
                        "area": 3115265.8232541024
                    },
                    {
                        "code": "c",
                        "type": "C - Slow Infiltration",
                        "coverage": 0.9465810843462092,
                        "area": 80847967.24370223
                    },
                    {
                        "code": "d",
                        "type": "D - Very Slow Infiltration",
                        "coverage": 0.00012606233782605497,
                        "area": 10767.047776223857
                    },
                    {
                        "code": "ad",
                        "type": "A/D - High/Very Slow Infiltration",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "code": "bd",
                        "type": "B/D - Medium/Very Slow Infiltration",
                        "coverage": 0.0017753779243836077,
                        "area": 151635.92284848596
                    },
                    {
                        "code": "cd",
                        "type": "C/D - Medium/Very Slow Infiltration",
                        "coverage": 0.015032933785757057,
                        "area": 1283970.4473146948
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.run.s('soil', geop_input, wkaoi),
        tasks.analyze_soil.s(area_of_interest)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.STREAM_DATASOURCE,
                                        schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_streams(request, datasource, format=None):
    """
    Starts a job to display streams & stream order within a given area of
    interest.

    For more information, see the [technical documentation](https://wikiwatershedorg/documentation/mmw-tech/#additional-data-layers)  # NOQA

    ## Response

    You can use the URL provided in the response's `Location` header
    to poll for the job's results.

    <summary>

      **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Streams",
                "name": "streams_nhd",
                "categories": [
                    {
                        "lengthkm": 2.598,
                        "total_weighted_slope": 0.05225867338,
                        "order": 1,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": 0.020114962809853736
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 2,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                         lengthkm": 0,
                         total_weighted_slope": null,
                         order": 3,
                         ag_stream_pct": 0.003416856492027335,
                         avgslope": null
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 4,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 5,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 21.228,
                        "total_weighted_slope": 0.00577236831,
                        "order": 6,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": 0.0002719223812888637
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 7,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 8,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 9,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 0,
                        "total_weighted_slope": null,
                        "order": 10,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    },
                    {
                        "lengthkm": 6.085,
                        "total_weighted_slope": null,
                        "order": 999,
                        "ag_stream_pct": 0.003416856492027335,
                        "avgslope": null
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    if datasource not in settings.STREAM_TABLES:
        raise ValidationError(f'Invalid stream datasource: {datasource}.'
                              ' Must be one of: "{}".'.format(
                                  '", "'.join(settings.STREAM_TABLES.keys())))

    return start_celery_job([
        geoprocessing.run.s('nlcd_streams',
                            {'polygon': [area_of_interest],
                             'vector': streams(area_of_interest, datasource)},
                            wkaoi,
                            cache_key=datasource),
        nlcd_streams.s(),
        tasks.analyze_streams.s(area_of_interest, datasource, wkaoi)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_animals(request, format=None):
    """
    Starts a job to produce counts for animals in a given area.

    Source USDA

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#additional-data-layers)  # NOQA

    ## Response

    You can use the URL provided in the response's `Location` header
    to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Animals",
                "name": "animals",
                "categories": [
                    {
                        "aeu": 0,
                        "type": "Sheep"
                    },
                    {
                        "aeu": 0,
                        "type": "Horses"
                    },
                    {
                        "aeu": 0,
                        "type": "Turkeys"
                    },
                    {
                        "aeu": 0,
                        "type": "Chickens, Layers"
                    },
                    {
                        "aeu": 0,
                        "type": "Cows, Beef"
                    },
                    {
                        "aeu": 0,
                        "type": "Pigs/Hogs/Swine"
                    },
                    {
                        "aeu": 0,
                        "type": "Cows, Dairy"
                    },
                    {
                        "aeu": 0,
                        "type": "Chickens, Broilers"
                    }
                ]
            }
        }
    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    return start_celery_job([
        tasks.analyze_animals.s(area_of_interest)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_pointsource(request, format=None):
    """
    Starts a job to analyze the discharge monitoring report annual
    averages for a given area.

    Source EPA NPDES

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#additional-data-layers)  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Point Source",
                "name": "pointsource",
                "categories": [
                    {
                        "city": "PHILADELPHIA",
                        "kgp_yr": 16937.8,
                        "mgd": 4.0835,
                        "npdes_id": "0011533",
                        "longitude": -75.209722,
                        "state": "PA",
                        "facilityname": "GIRARD POINT PROCESSING AREA",
                        "latitude": 39.909722,
                        "kgn_yr": 1160.76
                    }
                ], ...
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    return start_celery_job([
        tasks.analyze_pointsource.s(area_of_interest)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_catchment_water_quality(request, format=None):
    """
    Starts a job to calculate the calibrated GWLF-E (MapShed) model
    estimates for a given area
    (Delaware River Basin only)

    Source Stream Reach Tool Assessment (SRAT)

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage)  # NOQA

    ## Response

    you can use the url provided in the response's `location`
    header to poll for the job's results.

    <summary>
       **example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayname": "water quality",
                "name": "catchment_water_quality",
                "categories": [
                    {
                        "tss_urban_": 49.115354321566734,
                        "tn_riparia": 0.3730090214,
                        "tn_pt_kgyr": null,
                        "tp_urban_k": 0.5043825,
                        "tss_tot_kg": 336.49653266840215,
                        "geom": {
                            "type": "multipolygon",
                            "coordinates": [
                                [
                                    [
                                        [
                                            -74.9780151302813,
                                            40.0646039341582
                                        ], ...
                                    ], ...
                                ]
                            ]
                        },
                        "nord": 4793,
                        "tss_concmg": 124.5634,
                        "tp_ag_kgyr": 0.493174,
                        "tp_yr_avg_": 0.0929,
                        "tn_yr_avg_": 1.461,
                        "tn_ag_kgyr": 8.74263,
                        "tss_natura": 3.912097242622951,
                        "tp_pt_kgyr": null,
                        "tn_natural": 2.622789,
                        "areaha": 375.27,
                        "tp_tot_kgy": 0.51148576021895,
                        "tn_urban_k": 8.428792,
                        "tp_natural": 0.0560425,
                        "tp_riparia": 0.1240888899,
                        "tn_tot_kgy": 7.745244945328085,
                        "tss_ag_kgy": 66.71350648852459,
                        "tss_rip_kg": 545.9289658316266
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    return start_celery_job([
        tasks.analyze_catchment_water_quality.s(area_of_interest)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_climate(request, format=None):
    """
    Start a job to calculate the monthly climate (precipitation
    and mean temperature) of a given area.

    Source PRISM Climate Group

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage)  # NOQA

    ## Response

    You can use the url provided in the response's `location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                 "displayName": "Climate",
                 "name": "climate",
                 "categories": [
                     {
                         "ppt": 66.84088134765625,
                         "tmean": -2.4587886333465576,
                         "monthidx": 1,
                         "month": "January"
                     },
                     {
                         "ppt": 59.17946434020996,
                         "tmean": -1.8310737609863281,
                         "monthidx": 2,
                         "month": "February"
                     }, ...
                 ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None

    area_of_interest, wkaoi = _parse_input(request)
    shape = [{'id': wkaoi or geoprocessing.NOCACHE, 'shape': area_of_interest}]

    return start_celery_job([
        geoprocessing.multi.s('climate', shape, None),
        tasks.analyze_climate.s(wkaoi or geoprocessing.NOCACHE),
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_terrain(request, format=None):
    """
    Starts a job to produce summary statistics for elevation and slope in a
    given area.

    Source NHDPlus V2 NEDSnapshot DEM

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage).  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Soil",
                "name": "soil",
                "categories": [
                    {
                        "elevation": 25.03116786250801,
                        "slope": 2.708598957407307,
                        "type": "average"
                    },
                    {
                        "elevation": -0.84,
                        "slope": 0.0,
                        "type": "minimum"
                    },
                    {
                        "elevation": 105.01,
                        "slope": 44.52286911010742,
                        "type": "maximum"
                    }
                ]
            }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.run.s('terrain', geop_input, wkaoi),
        tasks.analyze_terrain.s()
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_protected_lands(request, format=None):
    """
    Starts a job to produce a protected lands histogram for a given area.

    Uses the Protected Areas Database of the United States (PADUS),
    published by the U.S. Geological Survey Gap Analysis Program in 2016.

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage).  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
          "survey": {
            "displayName": "Protected Lands",
            "name": "protected_lands",
            "categories": [
              {
                "area": 3589.015925407952,
                "class_id": 1,
                "code": "pra_f",
                "coverage": 0.00004202077927535166,
                "type": "Park or Recreational Area - Federal"
              },
              {
                "area": 0.0,
                "class_id": 2,
                "code": "pra_s",
                "coverage": 0.0,
                "type": "Park or Recreational Area - State"
              },
              {
                "area": 11292838.60929612,
                "class_id": 3,
                "code": "pra_l",
                "coverage": 0.132218381989894,
                "type": "Park or Recreational Area - Local"
              },
              {
                "area": 0.0,
                "class_id": 4,
                "code": "pra_p",
                "coverage": 0.0,
                "type": "Park or Recreational Area - Private"
              },
              {
                "area": 0.0,
                "class_id": 5,
                "code": "pra_u",
                "coverage": 0.0,
                "type": "Park or Recreational Area - Unknown"
              },
              {
                "area": 19739.587589743736,
                "class_id": 6,
                "code": "nra_f",
                "coverage": 0.00023111428601443412,
                "type": "Natural Resource Area - Federal"
              },
              {
                "area": 0.0,
                "class_id": 7,
                "code": "nra_s",
                "coverage": 0.0,
                "type": "Natural Resource Area - State"
              },
              {
                "area": 206368.41571095726,
                "class_id": 8,
                "code": "nra_l",
                "coverage": 0.0024161948083327206,
                "type": "Natural Resource Area - Local"
              },
              {
                "area": 4486.26990675994,
                "class_id": 9,
                "code": "nra_p",
                "coverage": 0.000052525974094189576,
                "type": "Natural Resource Area - Private"
              },
              {
                "area": 0.0,
                "class_id": 10,
                "code": "nra_u",
                "coverage": 0.0,
                "type": "Natural Resource Area - Unknown"
              },
              {
                "area": 0.0,
                "class_id": 11,
                "code": "con_ease",
                "coverage": 0.0,
                "type": "Conservation Easement"
              },
              {
                "area": 0.0,
                "class_id": 12,
                "code": "ag_ease",
                "coverage": 0.0,
                "type": "Agricultural Easement"
              }
            ]
          }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.run.s('protected_lands', geop_input, wkaoi),
        tasks.analyze_protected_lands.s(area_of_interest)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     manual_parameters=[schemas.DRB_2100_LAND_KEY,
                                        schemas.WKAOI],
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE,
                                400: schemas.DRB_2100_LAND_ERROR_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_analyze_drb_2100_land(request, key=None, format=None):
    """
    Starts a job to get a land-use histogram for an area within DRB in 2100.

    Uses simulations of change in land use over the 20-year period 2080-2099
    based on two urban growth scenarios: centers and corridors. Generated by
    Shippensburg University, serviced via APIs by Drexel University and the
    Academy of Natural Sciences.

    For more information, see the [technical documentation](https://wikiwatershed.org/documentation/mmw-tech/#overlays-tab-coverage).  # NOQA

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
          "survey": {
            "displayName": "DRB 2100 land forecast (corridors)",
            "name": "drb_2100_land_corridors",
            "categories": [
              {
                "area": 3572379,
                "code": "open_water",
                "coverage": 0.041698374846361526,
                "nlcd": 11,
                "type": "Open Water"
              },
              {
                "area": 0,
                "code": "perennial_ice",
                "coverage": 0.0,
                "nlcd": 12,
                "type": "Perennial Ice/Snow"
              },
              {
                "area": 10355769,
                "code": "developed_open",
                "coverage": 0.12087707871542477,
                "nlcd": 21,
                "type": "Developed, Open Space"
              },
              {
                "area": 11455623,
                "code": "developed_low",
                "coverage": 0.13371505709573384,
                "nlcd": 22,
                "type": "Developed, Low Intensity"
              },
              {
                "area": 27048582,
                "code": "developed_med",
                "coverage": 0.3157229149814583,
                "nlcd": 23,
                "type": "Developed, Medium Intensity"
              },
              {
                "area": 29183382,
                "code": "developed_high",
                "coverage": 0.3406412370917419,
                "nlcd": 24,
                "type": "Developed, High Intensity"
              },
              {
                "area": 11187,
                "code": "barren_land",
                "coverage": 0.00013057957159815528,
                "nlcd": 31,
                "type": "Barren Land (Rock/Sand/Clay)"
              },
              {
                "area": 2684196,
                "code": "deciduous_forest",
                "coverage": 0.03133111323549495,
                "nlcd": 41,
                "type": "Deciduous Forest"
              },
              {
                "area": 14301,
                "code": "evergreen_forest",
                "coverage": 0.00016692754567133446,
                "nlcd": 42,
                "type": "Evergreen Forest"
              },
              {
                "area": 93402,
                "code": "mixed_forest",
                "coverage": 0.001090229118298999,
                "nlcd": 43,
                "type": "Mixed Forest"
              },
              {
                "area": 114768,
                "code": "shrub",
                "coverage": 0.001339622443298211,
                "nlcd": 52,
                "type": "Shrub/Scrub"
              },
              {
                "area": 55143,
                "code": "grassland",
                "coverage": 0.000643653286550199,
                "nlcd": 71,
                "type": "Grassland/Herbaceous"
              },
              {
                "area": 59643,
                "code": "pasture",
                "coverage": 0.0006961792606443887,
                "nlcd": 81,
                "type": "Pasture/Hay"
              },
              {
                "area": 14193,
                "code": "cultivated_crops",
                "coverage": 0.0001656669222930739,
                "nlcd": 82,
                "type": "Cultivated Crops"
              },
              {
                "area": 574722,
                "code": "woody_wetlands",
                "coverage": 0.006708407307413516,
                "nlcd": 90,
                "type": "Woody Wetlands"
              },
              {
                "area": 434610,
                "code": "herbaceous_wetlands",
                "coverage": 0.0050729585780168295,
                "nlcd": 95,
                "type": "Emergent Herbaceous Wetlands"
              }
            ]
          }
        }

    </details>
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_input(request)

    errs = []
    if not key:
        errs.append('`key` must be specified')
    if key not in settings.DREXEL_FAST_ZONAL_API['keys']:
        errs.append('`key` must be one of "{}".'.format(
            '", "'.join(settings.DREXEL_FAST_ZONAL_API['keys'])))

    # A little redundant since GeoJSON -> GEOSGeometry is already done once
    # within _parse_input, but it is not returned from there and changing
    # that API could break many things.
    geom = GEOSGeometry(area_of_interest, srid=4326)

    # In the front-end, we use DRB_SIMPLE_PERIMETER. This is sent from the
    # back-end on every page render, and is considerably lighter ~0.2% than
    # the actual perimeter. We use the same here for consistency.
    if not geom.within(settings.DRB_SIMPLE_PERIMETER):
        errs.append('The area of interest must be within the'
                    ' Delaware River Basin.')

    if errs:
        return Response({'errors': errs}, status=status.HTTP_400_BAD_REQUEST)

    return start_celery_job([
        tasks.analyze_drb_2100_land.s(area_of_interest, key)
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     request_body=schemas.MULTIPOLYGON,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_modeling_worksheet(request, format=None):
    """
    Generate a set of BMP Worksheets prefilled with relevant data.

    Takes a model_input that contains an area of interest, and uses it to
    find which HUC-12s intersect with it. For every HUC-12 that intersects
    with the area of interest, we make pairs of thue HUC-12 and the clipped
    area which is contained within it. For every pair, we make a dictionary
    of numbers needed to make the BMP Worksheet. This job returns an array
    of dictionaries, which should be posted to the /export/worksheet/ endpoint
    to get the actual Excel files.
    """
    user = request.user if request.user.is_authenticated else None
    area_of_interest, _ = _parse_input(request)

    return start_celery_job([
        tasks.collect_worksheet.s(area_of_interest),
    ], area_of_interest, user)


@swagger_auto_schema(method='post',
                     request_body=schemas.MODELING_REQUEST,
                     responses={200: schemas.JOB_STARTED_RESPONSE})
@decorators.api_view(['POST'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((IsAuthenticated, ))
@decorators.throttle_classes([BurstRateThrottle, SustainedRateThrottle])
@log_request
def start_modeling_mapshed(request, format=None):
    user = request.user if request.user.is_authenticated else None
    area_of_interest, wkaoi = _parse_modeling_input(request.data)

    layer_overrides = request.data.get('layer_overrides', {})

    return start_celery_job([
        multi_mapshed(area_of_interest, wkaoi, layer_overrides),
        convert_data.s(wkaoi),
        collect_data.s(area_of_interest, layer_overrides=layer_overrides),
    ], area_of_interest, user)


def _initiate_rwd_job_chain(location, snapping, simplify, data_source,
                            job_id, testing=False):
    errback = save_job_error.s(job_id)

    return chain(tasks.start_rwd_job.s(location, snapping, simplify,
                 data_source), save_job_result.s(job_id, location)) \
        .apply_async(link_error=errback)


def start_celery_job(task_list, job_input, user=None, link_error=True):
    """
    Given a list of Celery tasks and it's input, starts a Celery async job with
    those tasks, adds save_job_result and save_job_error handlers, and returns
    the job's id which is used to query status and retrieve results via get_job

    :param task_list: A list of Celery tasks to execute. Is made into a chain
    :param job_input: Input to the first task, used in recording started jobs
    :param user: The user requesting the job. Optional.
    :param link_error: Whether or not to apply error handler to entire chain
    :return: A Response contianing the job id, marked as 'started'
    """
    created = now()
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started',
                             model_input=job_input)

    success = save_job_result.s(job.id, job_input)
    error = save_job_error.s(job.id)

    task_list.append(success)
    if link_error:
        task_chain = chain(task_list).apply_async(link_error=error)
    else:
        task_chain = chain(task_list).apply_async()

    job.uuid = task_chain.id
    job.save()

    return Response(
        {
            'job': task_chain.id,
            'status': 'started',
        },
        headers={'Location': reverse('geoprocessing_api:get_job',
                                     args=[task_chain.id])}
    )


def _parse_input(request):
    wkaoi = request.query_params.get('wkaoi', None)
    serializer = AoiSerializer(data={'area_of_interest': request.data,
                                     'wkaoi': wkaoi})
    serializer.is_valid(raise_exception=True)
    return (serializer.validated_data.get('area_of_interest'),
            wkaoi)
