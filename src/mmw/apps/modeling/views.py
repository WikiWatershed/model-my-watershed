# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import json
import random

import celery
from celery import chain, group

from retry import retry

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.permissions import (AllowAny,
                                        IsAuthenticated,
                                        IsAuthenticatedOrReadOnly)

from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.conf import settings
from django.db import connection
from django.contrib.gis.geos import WKBReader
from django.http import HttpResponse
from django.core.servers.basehttp import FileWrapper

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.modeling import tasks, geoprocessing
from apps.modeling.mapshed.tasks import (geoprocessing_chains,
                                         combine,
                                         collect_data,
                                         )
from apps.modeling.models import Project, Scenario
from apps.modeling.serializers import (ProjectSerializer,
                                       ProjectListingSerializer,
                                       ProjectUpdateSerializer,
                                       ScenarioSerializer)


# When CELERY_WORKER_DIRECT = True, this exchange is automatically
# created to allow direct communication with workers.
MAGIC_EXCHANGE = 'C.dq'


@decorators.api_view(['GET', 'POST'])
@decorators.permission_classes((IsAuthenticated, ))
def projects(request):
    """Get a list of all projects with embedded scenarios available for
       the logged in user.  POST to create a new project associated with the
       logged in user."""
    if request.method == 'GET':
        projects = Project.objects.filter(user=request.user)
        serializer = ProjectListingSerializer(projects, many=True)

        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ProjectUpdateSerializer(data=request.data,
                                             context={"request": request})
        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['DELETE', 'GET', 'PUT', 'PATCH'])
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def project(request, proj_id):
    """Retrieve, update or delete a project"""
    project = get_object_or_404(Project, id=proj_id)

    if request.method == 'GET':
        if project.user.id != request.user.id and project.is_private:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ProjectSerializer(project)
        return Response(serializer.data)

    elif project.user.id == request.user.id:
        if request.method == 'PUT':
            ctx = {'request': request}
            serializer = ProjectUpdateSerializer(project, data=request.data,
                                                 context=ctx)

            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)

            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'PATCH':
            ctx = {'request': request}
            serializer = ProjectListingSerializer(project, data=request.data,
                                                  context=ctx)

            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)

            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            project.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['POST'])
@decorators.permission_classes((IsAuthenticated, ))
def scenarios(request):
    """Create a scenario for projects which authenticated user has access to"""
    if request.method == 'POST':
        serializer = ScenarioSerializer(data=request.data,
                                        context={"request": request})

        project_id = serializer.initial_data.get('project')
        get_object_or_404(Project, id=project_id, user=request.user)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['DELETE', 'GET', 'PUT'])
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def scenario(request, scen_id):
    """Retrieve, update or delete a scenario"""
    scenario = get_object_or_404(Scenario, id=scen_id)

    if request.method == 'GET':
        if (scenario.project.user.id != request.user.id and
                scenario.project.is_private):
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ScenarioSerializer(scenario)
        return Response(serializer.data)

    elif scenario.project.user.id == request.user.id:
        if request.method == 'PUT':
            ctx = {'request': request}
            serializer = ScenarioSerializer(scenario, data=request.data,
                                            context=ctx)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data)
            return Response(serializer.errors,
                            status=status.HTTP_400_BAD_REQUEST)

        elif request.method == 'DELETE':
            scenario.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)

    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_rwd(request, format=None):
    """
    Starts a job to run Rapid Watershed Delineation on a point-based location.
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()
    location = request.POST['location']
    data_source = request.POST.get('dataSource', 'drb')

    # Parse out the JS style T/F to a boolean
    snappingParam = request.POST['snappingOn']
    snapping = True if snappingParam == 'true' else False

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
        }
    )


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_gwlfe(request, format=None):
    """
    Starts a job to run GWLF-E.
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()
    model_input = json.loads(request.POST['model_input'])
    inputmod_hash = request.POST.get('inputmod_hash', '')
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_gwlfe_job_chain(model_input, inputmod_hash, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


def _initiate_gwlfe_job_chain(model_input, inputmod_hash, job_id):
    chain = (tasks.run_gwlfe.s(model_input, inputmod_hash)
             .set(exchange=MAGIC_EXCHANGE, routing_key=choose_worker()) |
             save_job_result.s(job_id, model_input)
             .set(exchange=MAGIC_EXCHANGE, routing_key=choose_worker()))
    errback = save_job_error.s(job_id).set(exchange=MAGIC_EXCHANGE,
                                           routing_key=choose_worker())

    return chain.apply_async(link_error=errback)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_mapshed(request, format=None):
    """
    Starts a MapShed job which gathers data from various sources which
    eventually is input to start_gwlfe to model the watershed.
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()
    mapshed_input = json.loads(request.POST['mapshed_input'])
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_mapshed_job_chain(mapshed_input, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


def _initiate_mapshed_job_chain(mapshed_input, job_id):
    workers = get_living_workers()
    get_worker = lambda: random.choice(workers)
    errback = save_job_error.s(job_id).set(exchange=MAGIC_EXCHANGE,
                                           routing_key=get_worker())

    area_of_interest, wkaoi = parse_input(mapshed_input)

    job_chain = (
        group(geoprocessing_chains(area_of_interest, wkaoi,
                                   MAGIC_EXCHANGE, errback, choose_worker)) |
        combine.s().set(
            exchange=MAGIC_EXCHANGE,
            routing_key=get_worker()) |
        collect_data.s(area_of_interest).set(
            link_error=errback,
            exchange=MAGIC_EXCHANGE,
            routing_key=get_worker()) |
        save_job_result.s(job_id, mapshed_input).set(
            exchange=MAGIC_EXCHANGE,
            routing_key=get_worker()))

    return chain(job_chain).apply_async(link_error=errback)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def export_gms(request, format=None):
    mapshed_data = json.loads(request.POST.get('mapshed_data', '{}'))
    filename = request.POST.get('filename', None)

    if not mapshed_data or not filename:
        return Response('Must specify mapshed_data and filename',
                        status.HTTP_400_BAD_REQUEST)

    gms_file = tasks.to_gms_file(mapshed_data)

    response = HttpResponse(FileWrapper(gms_file), content_type='text/plain')
    response['Content-Disposition'] = 'attachment; '\
                                      'filename={}.gms'.format(filename)
    return response


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_land(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()

    area_of_interest, wkaoi = parse_input(request.POST['analyze_input'])

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.start.s('nlcd', geop_input, wkaoi)
                     .set(exchange=exchange, routing_key=routing_key),
        geoprocessing.finish.s()
                     .set(exchange=exchange, routing_key=routing_key),
        tasks.analyze_nlcd.s(area_of_interest)
             .set(exchange=exchange, routing_key=choose_worker())
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_soil(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()

    area_of_interest, wkaoi = parse_input(request.POST['analyze_input'])

    geop_input = {'polygon': [area_of_interest]}

    return start_celery_job([
        geoprocessing.start.s('soil', geop_input, wkaoi)
                     .set(exchange=exchange, routing_key=routing_key),
        geoprocessing.finish.s()
                     .set(exchange=exchange, routing_key=routing_key),
        tasks.analyze_soil.s(area_of_interest)
             .set(exchange=exchange, routing_key=choose_worker())
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_animals(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    area_of_interest, __ = parse_input(request.POST['analyze_input'])
    exchange = MAGIC_EXCHANGE

    return start_celery_job([
        tasks.analyze_animals.s(area_of_interest)
             .set(exchange=exchange, routing_key=choose_worker())
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_pointsource(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    area_of_interest, __ = parse_input(request.POST['analyze_input'])
    exchange = MAGIC_EXCHANGE

    return start_celery_job([
        tasks.analyze_pointsource.s(area_of_interest)
             .set(exchange=exchange, routing_key=choose_worker())
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_catchment_water_quality(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    area_of_interest, __ = parse_input(request.POST['analyze_input'])
    exchange = MAGIC_EXCHANGE

    return start_celery_job([
        tasks.analyze_catchment_water_quality.s(area_of_interest)
             .set(exchange=exchange, routing_key=choose_worker())
    ], area_of_interest, user)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def get_job(request, job_uuid, format=None):
    # Get the user so that logged in users can only see jobs that they
    # started.
    # TODO consider if we should have some sort of session id check to ensure
    # you can only view your own jobs.
    user = request.user if request.user.is_authenticated() else None
    job = get_object_or_404(Job, uuid=job_uuid, user=user)

    # TODO Should we return the error? Might leak info about the internal
    # workings that we don't want exposed.
    return Response(
        {
            'job_uuid': job.uuid,
            'status': job.status,
            'result': job.result,
            'error': job.error,
            'started': job.created_at,
            'finished': job.delivered_at,
        }
    )


def get_living_workers():
    def predicate(worker_name):
        return settings.STACK_COLOR in worker_name or 'debug' in worker_name

    @retry(Exception, delay=0.5, backoff=2, tries=3)
    def get_list_of_workers():
        workers = celery.current_app.control.inspect().ping()

        if workers is None:
            raise Exception('Unable to receive a PONG from any workers')

        return workers.keys()

    workers = filter(predicate,
                     get_list_of_workers())
    return workers


def choose_worker():
    return random.choice(get_living_workers())


def _initiate_rwd_job_chain(location, snapping, data_source,
                            job_id, testing=False):
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()
    errback = save_job_error.s(job_id).set(exchange=MAGIC_EXCHANGE,
                                           routing_key=choose_worker())

    return chain(tasks.start_rwd_job.s(location, snapping, data_source)
                 .set(exchange=exchange, routing_key=routing_key),
                 save_job_result.s(job_id, location)
                 .set(exchange=exchange, routing_key=choose_worker())) \
        .apply_async(link_error=errback)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_tr55(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    created = now()

    model_input = json.loads(request.POST['model_input'])
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')
    task_list = _initiate_tr55_job_chain(model_input, job.id)
    job.uuid = task_list.id
    job.save()

    return Response({
        'job': task_list.id,
        'status': 'started',
    })


def _initiate_tr55_job_chain(model_input, job_id):
    job_chain = _construct_tr55_job_chain(model_input, job_id)
    errback = save_job_error.s(job_id).set(exchange=MAGIC_EXCHANGE,
                                           routing_key=choose_worker())

    return chain(job_chain).apply_async(link_error=errback)


def _construct_tr55_job_chain(model_input, job_id):
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()

    job_chain = []

    aoi, wkaoi = parse_input(model_input, geojson=False)
    aoi_census = model_input.get('aoi_census')
    modification_censuses = model_input.get('modification_censuses')
    # Non-overlapping polygons derived from the modifications
    pieces = model_input.get('modification_pieces', [])
    # The hash of the current modifications
    current_hash = model_input.get('modification_hash')

    # The hash of the modifications whose censuses we already have
    census_hash = None
    # The list of already-computed censuses of the modifications
    modification_census_items = []
    if modification_censuses:
        census_hash = modification_censuses.get('modification_hash')
        modification_census_items = modification_censuses.get('censuses')

    if (aoi_census and ((modification_census_items and
       census_hash == current_hash) or not pieces)):
        censuses = [aoi_census] + modification_census_items

        job_chain.append(tasks.run_tr55.s(censuses, aoi, model_input)
                         .set(exchange=exchange, routing_key=choose_worker()))
    else:
        job_chain.append(geoprocessing.finish.s()
                         .set(exchange=exchange, routing_key=routing_key))
        job_chain.append(tasks.nlcd_soil_census.s()
                         .set(exchange=exchange, routing_key=choose_worker()))

        if aoi_census and pieces:
            polygons = [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}

            job_chain.insert(0, geoprocessing.start.s('nlcd_soil_census',
                                                      geop_input)
                             .set(exchange=exchange, routing_key=routing_key))
            job_chain.append(tasks.run_tr55.s(aoi, model_input,
                                              cached_aoi_census=aoi_census)
                             .set(exchange=exchange,
                                  routing_key=choose_worker()))
        else:
            polygons = [aoi] + [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}
            # Use WKAoI only if there are no pieces to modify the AoI
            wkaoi = wkaoi if not pieces else None

            job_chain.insert(0, geoprocessing.start.s('nlcd_soil_census',
                                                      geop_input,
                                                      wkaoi)
                             .set(exchange=exchange, routing_key=routing_key))
            job_chain.append(tasks.run_tr55.s(aoi, model_input)
                             .set(exchange=exchange,
                                  routing_key=choose_worker()))

    job_chain.append(save_job_result.s(job_id, model_input)
                     .set(exchange=exchange, routing_key=choose_worker()))

    return job_chain


def _get_boundary_layer_by_code(code):
    for layer in settings.LAYER_GROUPS['boundary']:
        if layer.get('code') == code:
            return layer
    return False


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_detail(request, table_code, obj_id):
    geojson = get_layer_shape(table_code, obj_id)

    if geojson:
        return Response(json.loads(geojson))
    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


def _get_boundary_search_query(search_term):
    """
    Return raw SQL query to perform full text search against
    all searchable boundary layers.
    """
    select_fmt = """
        (SELECT id, '{code}' AS code, name, {rank} AS rank,
            ST_Centroid(geom) as center
        FROM {table}
        WHERE UPPER(name) LIKE UPPER(%(term)s)
        LIMIT 3)
    """.strip()

    selects = []
    for layer in settings.LAYER_GROUPS['boundary']:
        if not layer.get('searchable'):
            continue

        code = layer['code']
        table_name = layer['table_name']
        rank = layer.get('search_rank', 0)

        selects.append(select_fmt.format(
            code=code, table=table_name, rank=rank))

    if len(selects) == 0:
        raise Exception('No boundary layers are searchable')

    subquery = ' UNION ALL '.join(selects)

    return """
        SELECT id, code, name, rank, center
        FROM ({}) AS subquery
        ORDER BY rank DESC, name
    """.format(subquery)


def _do_boundary_search(search_term):
    """
    Execute full text search against all searchable boundary layers.
    """
    result = []
    query = _get_boundary_search_query(search_term)

    with connection.cursor() as cursor:
        wildcard_term = '%{}%'.format(search_term)
        cursor.execute(query, {'term': wildcard_term})

        wkb_r = WKBReader()

        for row in cursor.fetchall():
            id = row[0]
            code = row[1]
            name = row[2]
            rank = row[3]
            point = wkb_r.read(row[4])

            layer = _get_boundary_layer_by_code(code)

            result.append({
                'id': id,
                'code': code,
                'text': name,
                'label': layer['short_display'],
                'rank': rank,
                'y': point.y,
                'x': point.x,
            })

    return result


def _boundary_search_context(search_term):
    suggestions = [] if len(search_term) < 3 else \
        _do_boundary_search(search_term)
    # Data format should match the ArcGIS API suggest endpoint response
    return {
        'suggestions': suggestions,
    }


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_search(request):
    search_term = request.query_params.get('text')
    if not search_term:
        return Response('Missing query string param: text',
                        status=status.HTTP_400_BAD_REQUEST)
    result = _boundary_search_context(search_term)
    return Response(result)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def drb_point_sources(request):
    query = '''
          SELECT ST_X(geom) as lon, ST_Y(geom) as lat, city, state, npdes_id,
                 mgd, kgn_yr, kgp_yr, facilityname
          FROM ms_pointsource_drb
          '''

    point_source_results = {u'type': u'FeatureCollection', u'features': []}

    with connection.cursor() as cursor:
        cursor.execute(query)

        point_source_array = [
            {
                'type': 'Feature',
                'geometry': {
                    'type': 'Point',
                    'coordinates': [row[0], row[1]],
                },
                'properties': {
                    'city': row[2],
                    'state': row[3],
                    'npdes_id': row[4],
                    'mgd': float(row[5]) if row[5] else None,
                    'kgn_yr': float(row[6]) if row[6] else None,
                    'kgp_yr': float(row[7]) if row[7] else None,
                    'facilityname': row[8]
                }

            } for row in cursor.fetchall()
        ]

    point_source_results['features'] = point_source_array

    return Response(json.dumps(point_source_results),
                    headers={'Cache-Control': 'max-age: 604800'})


def start_celery_job(task_list, job_input, user=None,
                     exchange=MAGIC_EXCHANGE, routing_key=None):
    """
    Given a list of Celery tasks and it's input, starts a Celery async job with
    those tasks, adds save_job_result and save_job_error handlers, and returns
    the job's id which is used to query status and retrieve results via get_job

    :param task_list: A list of Celery tasks to execute. Is made into a chain
    :param job_input: Input to the first task, used in recording started jobs
    :param user: The user requesting the job. Optional.
    :param exchange: Allows restricting jobs to specific exchange. Optional.
    :param routing_key: Allows restricting jobs to specific workers. Optional.
    :return: A Response contianing the job id, marked as 'started'
    """
    created = now()
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started',
                             model_input=job_input)
    routing_key = routing_key if routing_key else choose_worker()
    success = save_job_result.s(job.id, job_input).set(exchange=exchange,
                                                       routing_key=routing_key)
    error = save_job_error.s(job.id).set(exchange=exchange,
                                         routing_key=routing_key)

    task_list.append(success)
    task_chain = chain(task_list).apply_async(link_error=error)

    job.uuid = task_chain.id
    job.save()

    return Response(
        {
            'job': task_chain.id,
            'status': 'started',
        }
    )


def get_layer_shape(table_code, id):
    """
    Fetch shape of well known area of interest.

    :param table_code: Code of table
    :param id: ID of the shape
    :return: GeoJSON of shape if found, None otherwise
    """
    layer = _get_boundary_layer_by_code(table_code)
    if not layer:
        return None

    table = layer['table_name']
    field = layer.get('json_field', 'geom')

    sql = '''
          SELECT ST_AsGeoJSON({field})
          FROM {table}
          WHERE id = %s
          '''.format(field=field, table=table)

    with connection.cursor() as cursor:
        cursor.execute(sql, [int(id)])
        row = cursor.fetchone()

        if row:
            return row[0]
        else:
            return None


def parse_input(model_input, geojson=True):
    """
    Parse input into tuple of AoI JSON and WKAoI id.

    If the input has an 'area_of_interest' key, it is returned as the AoI JSON
    and None as the WKAoI. If the input has a 'wkaoi' key, its shape is pulled
    from the appropriate database, and returned with the value of 'wkaoi' as
    the WKAoI.

    If the geojson parameter is set to False, the area of interest is returned
    as a dict instead of a JSON string.
    """
    if not model_input:
        return Response('model_input cannot be empty',
                        status=status.HTTP_400_BAD_REQUEST)

    if isinstance(model_input, basestring):
        # Input is string, assumed JSON. Convert to dict before proceeding
        model_input = json.loads(model_input)

    if 'area_of_interest' in model_input:
        # Area of Interest is expected to be GeoJSON in 4326
        shape = geoprocessing.to_one_ring_multipolygon(
            model_input['area_of_interest']
        )

        result = json.dumps(shape) if geojson else shape
        return result, None

    if 'wkaoi' in model_input:
        # WKAoI is expected to be in the format '{table}__{id}'
        table, id = model_input['wkaoi'].split('__')
        shape = get_layer_shape(table, id)

        if shape:
            result = shape if geojson else json.loads(shape)
            return result, model_input['wkaoi']
        else:
            return Response('Invalid wkaoi: {}'.format(model_input['wkaoi']),
                            status=status.HTTP_400_BAD_REQUEST)

    # If neither 'area_of_interest' nor 'wkaoi' were found, report
    return Response('model_input must have either area_of_interest or wkaoi',
                    status=status.HTTP_400_BAD_REQUEST)
