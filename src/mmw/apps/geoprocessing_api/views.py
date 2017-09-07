# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from celery import chain

from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny

from django.utils.timezone import now
from django.core.urlresolvers import reverse

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.modeling import geoprocessing
from apps.modeling.views import load_area_of_interest
from apps.geoprocessing_api import tasks


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_rwd(request, format=None):
    """
    Starts a job to run Rapid Watershed Delineation on a point-based location.

    Selects the nearest downhill point on the medium resolution flow lines of
    either the Delaware River Basin high resolution stream network or the
    National Hydrography Dataset (NHDplus v2). The watershed area upstream of
    this point is automatically delineated using the 10m resolution national
    elevation model or the 30m resolution flow direction grid.

    For more information, see the
    [technical documentation](https://wikiwatershed.org/
    documentation/mmw-tech/#delineate-watershed).

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

    **Example**

        {
            "location": [39.97185812402583,-75.16742706298828],
            "snappingOn": true,
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
                                        -75.24776006176894,
                                        39.98166667527191
                                    ],
                                    [
                                        -75.24711191361516,
                                        39.98166667527191
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
                                -75.24938043215342,
                                39.97875000854888
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
    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         required: true
         paramType: body
    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()
    location = request.data['location']
    data_source = request.data.get('dataSource', 'drb')
    snapping = request.data.get('snappingOn', False)

    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_rwd_job_chain(location, snapping, data_source,
                                        job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        },
        headers={'Location': reverse('get_job', args=[task_list.id])}
    )


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_land(request, format=None):
    """
    Starts a job to produce a land-use histogram for a given area.

    Uses the National Land Cover Database (NLCD 2011)

    For more information, see the
    [technical documentation](https://wikiwatershed.org/
    documentation/mmw-tech/#overlays-tab-coverage).

    ## Response

    You can use the URL provided in the response's `Location`
    header to poll for the job's results.

    <summary>
       **Example of a completed job's `result`**
    </summary>

    <details>

        {
            "survey": {
                "displayName": "Land",
                "name": "land",
                "categories": [
                    {
                        "nlcd": 43,
                        "code": "mixed_forest",
                        "type": "Mixed Forest",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 71,
                        "code": "grassland",
                        "type": "Grassland/Herbaceous",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 41,
                        "code": "deciduous_forest",
                        "type": "Deciduous Forest",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 42,
                        "code": "evergreen_forest",
                        "type": "Evergreen Forest",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 11,
                        "code": "open_water",
                        "type": "Open Water",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 12,
                        "code": "perennial_ice",
                        "type": "Perennial Ice/Snow",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 81,
                        "code": "pasture",
                        "type": "Pasture/Hay",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 82,
                        "code": "cultivated_crops",
                        "type": "Cultivated Crops",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 52,
                        "code": "shrub",
                        "type": "Shrub/Scrub",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 21,
                        "code": "developed_open",
                        "type": "Developed, Open Space",
                        "coverage": 0.030303030303030304,
                        "area": 2691.709835265247
                    },
                    {
                        "nlcd": 22,
                        "code": "developed_low",
                        "type": "Developed, Low Intensity",
                        "coverage": 0.18181818181818182,
                        "area": 16150.259011591483
                    },
                    {
                        "nlcd": 23,
                        "code": "developed_med",
                        "type": "Developed, Medium Intensity",
                        "coverage": 0.5151515151515151,
                        "area": 45759.0671995092
                    },
                    {
                        "nlcd": 24,
                        "code": "developed_high",
                        "type": "Developed, High Intensity",
                        "coverage": 0.2727272727272727,
                        "area": 24225.388517387222
                    },
                    {
                        "nlcd": 90,
                        "code": "woody_wetlands",
                        "type": "Woody Wetlands",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 95,
                        "code": "herbaceous_wetlands",
                        "type": "Emergent Herbaceous Wetlands",
                        "coverage": 0,
                        "area": 0
                    },
                    {
                        "nlcd": 31,
                        "code": "barren_land",
                        "type": "Barren Land (Rock/Sand/Clay)",
                        "coverage": 0,
                        "area": 0
                    }
                ]
            }
        }

    </details>
    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         description: A valid single-ringed Multipolygon GeoJSON
                      representation of the shape to analyze.
                      See the GeoJSON spec
                      https://tools.ietf.org/html/rfc7946#section-3.1.7
         paramType: body
         type: object
       - name: wkaoi
         description: The table and ID for a well-known area of interest,
                      such as a HUC.
                      Format "table__id", eg. "huc12__55174" will analyze
                      the HUC-12 City of Philadelphia-Schuylkill River.
         type: string
         paramType: query

    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.run.s('nlcd', geop_input, wkaoi),
        tasks.analyze_nlcd.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_soil(request, format=None):
    """
    Starts a job to produce a soil-type histogram for a given area.

    Uses the Hydrologic Soil Groups From USDA gSSURGO 2016

    For more information, see the
    [technical documentation](https://wikiwatershed.org/
    documentation/mmw-tech/#overlays-tab-coverage).

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

    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         description: A valid single-ringed Multipolygon GeoJSON
                      representation of the shape to analyze.
                      See the GeoJSON spec
                      https://tools.ietf.org/html/rfc7946#section-3.1.7
         paramType: body
         type: object
       - name: wkaoi
         description: The table and ID for a well-known area of interest,
                      such as a HUC.
                      Format "table__id", eg. "huc12__55174" will analyze
                      the HUC-12 City of Philadelphia-Schuylkill River.
         type: string
         paramType: query

    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.run.s('soil', geop_input, wkaoi),
        tasks.analyze_soil.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_animals(request, format=None):
    """
    Starts a job to produce counts for animals in a given area.

    Source USDA

    For more information, see
    the [technical documentation](https://wikiwatershed.org/documentation/
    mmw-tech/#additional-data-layers)

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
    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         description: A valid single-ringed Multipolygon GeoJSON
                      representation of the shape to analyze.
                      See the GeoJSON spec
                      https://tools.ietf.org/html/rfc7946#section-3.1.7
         paramType: body
         type: object
       - name: wkaoi
         description: The table and ID for a well-known area of interest,
                      such as a HUC.
                      Format "table__id", eg. "huc12__55174" will analyze
                      the HUC-12 City of Philadelphia-Schuylkill River.
    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    return start_celery_job([
        tasks.analyze_animals.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_pointsource(request, format=None):
    """
    Starts a job to analyze the discharge monitoring report annual
    averages for a given area.

    Source EPA NPDES

    For more information, see the
    [technical documentation](https://wikiwatershed.org/
    documentation/mmw-tech/#additional-data-layers)

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
    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         description: A valid single-ringed Multipolygon GeoJSON
                      representation of the shape to analyze.
                      See the GeoJSON spec
                      https://tools.ietf.org/html/rfc7946#section-3.1.7
         paramType: body
         type: object
       - name: wkaoi
         description: The table and ID for a well-known area of interest,
                      such as a HUC.
                      Format "table__id", eg. "huc12__55174" will analyze
                      the HUC-12 City of Philadelphia-Schuylkill River.
    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    return start_celery_job([
        tasks.analyze_pointsource.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_catchment_water_quality(request, format=None):
    """
    Starts a job to calculate the calibrated GWLF-E (MapShed) model
    estimates for a given area
    (Delaware River Basin only)

    Source Stream Reach Tool Assessment (SRAT)

    For more information, see
    the [technical documentation](https://wikiwatershed.org/
    documentation/mmw-tech/#overlays-tab-coverage)

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

    ---
    type:
      job:
        required: true
        type: string
      status:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: body
         description: A valid single-ringed Multipolygon GeoJSON
                      representation of the shape to analyze.
                      See the GeoJSON spec
                      https://tools.ietf.org/html/rfc7946#section-3.1.7
         paramType: body
         type: object
       - name: wkaoi
         description: The table and ID for a well-known area of interest,
                      such as a HUC.
                      Format "table__id", eg. "huc12__55174" will analyze
                      the HUC-12 City of Philadelphia-Schuylkill River.
    consumes:
        - application/json
    produces:
        - application/json
    """
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    return start_celery_job([
        tasks.analyze_catchment_water_quality.s(area_of_interest)
    ], area_of_interest, user)


def _initiate_rwd_job_chain(location, snapping, data_source,
                            job_id, testing=False):
    errback = save_job_error.s(job_id)

    return chain(tasks.start_rwd_job.s(location, snapping, data_source),
                 save_job_result.s(job_id, location)) \
        .apply_async(link_error=errback)


def start_celery_job(task_list, job_input, user=None):
    """
    Given a list of Celery tasks and it's input, starts a Celery async job with
    those tasks, adds save_job_result and save_job_error handlers, and returns
    the job's id which is used to query status and retrieve results via get_job

    :param task_list: A list of Celery tasks to execute. Is made into a chain
    :param job_input: Input to the first task, used in recording started jobs
    :param user: The user requesting the job. Optional.
    :return: A Response contianing the job id, marked as 'started'
    """
    created = now()
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started',
                             model_input=job_input)

    success = save_job_result.s(job.id, job_input)
    error = save_job_error.s(job.id)

    task_list.append(success)
    task_chain = chain(task_list).apply_async(link_error=error)

    job.uuid = task_chain.id
    job.save()

    return Response(
        {
            'job': task_chain.id,
            'status': 'started',
        },
        headers={'Location': reverse('get_job', args=[task_chain.id])}
    )
