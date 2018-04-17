# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import json

from celery import chain, group

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.exceptions import ValidationError
from rest_framework.authentication import (SessionAuthentication,
                                           TokenAuthentication)
from rest_framework.permissions import (AllowAny,
                                        IsAuthenticated,
                                        IsAuthenticatedOrReadOnly)

from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.db import connection
from django.db.models.sql import EmptyResultSet
from django.http import (HttpResponse,
                         Http404,
                         )

from django.core.servers.basehttp import FileWrapper

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.core.decorators import log_request
from apps.modeling import tasks, geoprocessing
from apps.modeling.mapshed.tasks import (multi_subbasin,
                                         multi_mapshed,
                                         convert_data,
                                         collect_data,
                                         collect_subbasin,
                                         )
from apps.modeling.models import Project, Scenario
from apps.modeling.serializers import (ProjectSerializer,
                                       ProjectListingSerializer,
                                       ProjectUpdateSerializer,
                                       ScenarioSerializer,
                                       AoiSerializer)
from apps.modeling.calcs import (get_layer_shape,
                                 apply_gwlfe_modifications,
                                 boundary_search_context,
                                 split_into_huc12s)


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
@log_request
def start_gwlfe(request, format=None):
    """
    Starts a job to run GWLF-E.

    The request body should contain the `inputmod_hash` of
    the request and either the job UUID id of a successful
    MapShed run as 'mapshed_job_uuid', or the serialized GMS
    as 'model_input'.

    If ?subbasin=true, will expect a dictionary where the keys
    are subbasin (HUC-12) ids, and the values are the MapShed data.
    Will start a GWLF-E job, the result of which will be dictionary
    of the sub-basins and their results.
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()

    mapshed_job_uuid = request.POST.get('mapshed_job_uuid', None)

    if mapshed_job_uuid:
        mapshed_job = get_object_or_404(Job, uuid=mapshed_job_uuid)
        model_input = json.loads(mapshed_job.result)
    else:
        model_input = json.loads(request.POST.get('model_input'))

    modifications = json.loads(request.POST.get('modifications', '[]'))

    inputmod_hash = request.POST.get('inputmod_hash', '')
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    if request.query_params.get('subbasin', False) == 'true':
        task_list = _initiate_subbasin_gwlfe_job_chain(model_input,
                                                       mapshed_job_uuid,
                                                       modifications,
                                                       inputmod_hash,
                                                       job.id)
    else:
        task_list = _initiate_gwlfe_job_chain(model_input,
                                              modifications,
                                              inputmod_hash,
                                              job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


def _initiate_gwlfe_job_chain(model_input, modifications,
                              inputmod_hash, job_id):
    modified_model_input = apply_gwlfe_modifications(model_input,
                                                     modifications)
    chain = (tasks.run_gwlfe.s(modified_model_input, inputmod_hash)
             | save_job_result.s(job_id, modified_model_input))

    errback = save_job_error.s(job_id)

    return chain.apply_async(link_error=errback)


def _initiate_subbasin_gwlfe_job_chain(model_input, mapshed_job_uuid,
                                       modifications, inputmod_hash,
                                       job_id, chunk_size=8):
    errback = save_job_error.s(job_id)

    # Split the sub-basin ids into a list of lists. (We'll refer to
    # each inner list as a "chunk")
    watershed_ids = list(model_input.keys())
    watershed_id_chunks = [watershed_ids[x:x+chunk_size]
                           for x in range(0, len(watershed_ids), chunk_size)]

    # Create a celery group where each task in the group
    # runs gwlfe synchronously on a chunk of subbasin ids.
    # This is to keep the number of tasks in the group low. Celery will
    # not return the aggregate chain's job_id (which we need for the job
    # submission response) until all tasks have been submitted.
    # If we don't chunk, a shape that has 60+ subbasins could take >60sec
    # to generate a response (and thus timeout) because we'll be waiting to
    # submit one task for each subbasin.
    gwlfe_chunked_group = group(iter([
        tasks.run_gwlfe_chunks.s(mapshed_job_uuid,
                                 modifications,
                                 inputmod_hash,
                                 watershed_id_chunk)
        for watershed_id_chunk in watershed_id_chunks]))

    post_process = \
        tasks.subbasin_results_to_dict.s().set(link_error=errback) | \
        tasks.run_srat.s(mapshed_job_uuid).set(link_error=errback) | \
        save_job_result.s(job_id, mapshed_job_uuid)

    return (gwlfe_chunked_group | post_process).apply_async()


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
@log_request
def start_mapshed(request, format=None):
    """
    Starts a MapShed job which gathers data from various sources which
    eventually is input to start_gwlfe to model the watershed.

    If the input shape is a HUC-8 or HUC-10, it is split into its component
    HUC-12s. The started MapShed job gathers data for each and returns
    them in a dictionary where the keys are the huc12 ids.
    """
    user = request.user if request.user.is_authenticated() else None
    created = now()
    mapshed_input = json.loads(request.POST['mapshed_input'])
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    if request.query_params.get('subbasin', False) == 'true':
        task_list = _initiate_subbasin_mapshed_job_chain(mapshed_input, job.id)
    else:
        task_list = _initiate_mapshed_job_chain(mapshed_input, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


def _initiate_subbasin_mapshed_job_chain(mapshed_input, job_id):
    errback = save_job_error.s(job_id)

    area_of_interest, wkaoi = _parse_input(mapshed_input)

    if not wkaoi:
        raise ValidationError('You must provide the `wkaoi` key: ' +
                              'a HUC id is currently required for ' +
                              'subbasin modeling.')

    [layer_code, shape_id] = wkaoi.split('__')
    if layer_code not in ['huc8', 'huc10']:
        raise ValidationError('Only HUC-08s and HUC-10s are valid for ' +
                              'subbasin modeling.')

    huc12s = split_into_huc12s(layer_code, shape_id)
    if not huc12s:
        raise EmptyResultSet('No subbasins found')

    job_chain = (multi_subbasin(area_of_interest, huc12s) |
                 collect_subbasin.s(huc12s) |
                 tasks.subbasin_results_to_dict.s() |
                 save_job_result.s(job_id, mapshed_input))

    return job_chain.apply_async(link_error=errback)


def _initiate_mapshed_job_chain(mapshed_input, job_id):
    errback = save_job_error.s(job_id)

    area_of_interest, wkaoi = _parse_input(mapshed_input)

    job_chain = (
        multi_mapshed(area_of_interest, wkaoi) |
        convert_data.s(wkaoi) |
        collect_data.s(area_of_interest) |
        save_job_result.s(job_id, mapshed_input))

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
@log_request
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
    errback = save_job_error.s(job_id)

    return chain(job_chain).apply_async(link_error=errback)


def _construct_tr55_job_chain(model_input, job_id):

    job_chain = []

    aoi_json_str, wkaoi = _parse_input(model_input)
    aoi = json.loads(aoi_json_str)
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

        job_chain.append(tasks.run_tr55.s(censuses, aoi, model_input))
    else:
        job_chain.append(tasks.nlcd_soil.s())

        if aoi_census and pieces:
            polygons = [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}

            job_chain.insert(0, geoprocessing.run.s('nlcd_soil',
                                                    geop_input))
            job_chain.append(tasks.run_tr55.s(aoi, model_input,
                                              cached_aoi_census=aoi_census))
        else:
            polygons = [aoi] + [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}
            # Use WKAoI only if there are no pieces to modify the AoI
            wkaoi = wkaoi if not pieces else None

            job_chain.insert(0, geoprocessing.run.s('nlcd_soil',
                                                    geop_input,
                                                    wkaoi))
            job_chain.append(tasks.run_tr55.s(aoi, model_input))

    job_chain.append(save_job_result.s(job_id, model_input))

    return job_chain


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_detail(request, table_code, obj_id):
    geojson = get_layer_shape(table_code, obj_id)

    if geojson:
        return Response(json.loads(geojson))
    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_search(request):
    search_term = request.query_params.get('text')
    if not search_term:
        return Response('Missing query string param: text',
                        status=status.HTTP_400_BAD_REQUEST)
    result = boundary_search_context(search_term)
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


@decorators.api_view(['GET'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((AllowAny, ))
@log_request
def get_job(request, job_uuid, format=None):
    """
    Get a job's status. If it's complete, get its result.

    ---
    type:
      job_uuid:
        required: true
        type: string
      status:
        required: true
        type: string
      started:
        required: true
        type: datetime
      finished:
        required: true
        type: datetime
      result:
        required: true
        type: object
      error:
        required: true
        type: string

    omit_serializer: true
    parameters:
       - name: Authorization
         paramType: header
         description: Format "Token&nbsp;YOUR_API_TOKEN_HERE". When using
                      Swagger you may wish to set this for all requests via
                      the field at the top right of the page.
    """
    # TODO consider if we should have some sort of session id check to ensure
    # you can only view your own jobs.
    try:
        job = Job.objects.get(uuid=job_uuid)
    except Job.DoesNotExist:
        raise Http404("Not found.")

    # Get the user so that logged in users can only see jobs that they started
    # or anonymous ones
    user = request.user if request.user.is_authenticated() else None
    if job.user and job.user != user:
        raise Http404("Not found.")

    # TODO Should we return the error? Might leak info about the internal
    # workings that we don't want exposed.

    # Parse results to json if it is valid json
    try:
        result = json.loads(job.result)
    except ValueError:
        result = job.result

    return Response(
        {
            'job_uuid': job.uuid,
            'status': job.status,
            'result': result,
            'error': job.error,
            'started': job.created_at,
            'finished': job.delivered_at,
        }
    )


def _parse_input(model_input):
    serializer = AoiSerializer(data=model_input)
    serializer.is_valid(raise_exception=True)
    area_of_interest = serializer.validated_data.get('area_of_interest')
    wkaoi = serializer.validated_data.get('wkaoi')
    return area_of_interest, wkaoi
