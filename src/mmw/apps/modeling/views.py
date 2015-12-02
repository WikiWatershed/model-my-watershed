# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import json
import random

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.permissions import (AllowAny,
                                        IsAuthenticated,
                                        IsAuthenticatedOrReadOnly)

from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.conf import settings
from django.db import connection
from django.contrib.gis.geos import GEOSGeometry

import celery
from celery import chain

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.modeling import tasks
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
def start_analyze(request, format=None):
    user = request.user if request.user.is_authenticated() else None
    created = now()
    area_of_interest = request.POST['area_of_interest']
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_analyze_job_chain(area_of_interest, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


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


def choose_worker():
    def predicate(worker_name):
        return settings.STACK_COLOR in worker_name or 'debug' in worker_name

    workers = filter(predicate,
                     celery.current_app.control.inspect().ping().keys())
    return random.choice(workers)


def _initiate_analyze_job_chain(area_of_interest, job_id, testing=False):
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()

    return chain(tasks.start_histogram_job.s(area_of_interest)
                 .set(exchange=exchange, routing_key=routing_key),
                 tasks.get_histogram_job_results.s()
                 .set(exchange=exchange, routing_key=routing_key),
                 tasks.histogram_to_survey.s(),
                 save_job_result.s(job_id, area_of_interest)) \
        .apply_async(link_error=save_job_error.s(job_id))


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

    return chain(job_chain).apply_async(link_error=save_job_error.s(job_id))


def _construct_tr55_job_chain(model_input, job_id):
    exchange = MAGIC_EXCHANGE
    routing_key = choose_worker()

    job_chain = []

    aoi = model_input.get('area_of_interest')
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

    if (aoi_census and ((modification_census_items and False) or not pieces)):
        censuses = [aoi_census] + modification_census_items

        job_chain.append(tasks.run_tr55.s(censuses, model_input))
    else:
        job_chain.append(tasks.get_histogram_job_results.s()
                         .set(exchange=exchange, routing_key=routing_key))
        job_chain.append(tasks.histograms_to_censuses.s()
                         .set(exchange=exchange, routing_key=routing_key))

        if aoi_census and pieces:
            polygons = [m['shape']['geometry'] for m in pieces]

            job_chain.insert(0, tasks.start_histograms_job.s(polygons)
                             .set(exchange=exchange, routing_key=routing_key))
            job_chain.insert(len(job_chain), tasks.run_tr55.s(model_input,
                             cached_aoi_census=aoi_census))
        else:
            polygons = [aoi] + [m['shape']['geometry'] for m in pieces]

            job_chain.insert(0, tasks.start_histograms_job.s(polygons)
                             .set(exchange=exchange, routing_key=routing_key))
            job_chain.insert(len(job_chain), tasks.run_tr55.s(model_input))

    job_chain.append(save_job_result.s(job_id, model_input))

    return job_chain


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_detail(request, table_code, obj_id):
    try:
        layers = [layer for layer in settings.LAYERS
                  if layer.get('code') == table_code and
                  layer.get('boundary')]
        table_name = layers[0]['table_name']
        json_field = layers[0].get('json_field', 'geom')

        query = 'SELECT {field} FROM {table} WHERE id = %s'.format(
                field=json_field, table=table_name)
    except (KeyError, IndexError):
        return Response(status=status.HTTP_404_NOT_FOUND)

    with connection.cursor() as cursor:
        cursor.execute(query, [int(obj_id)])
        row = cursor.fetchone()

        if row:
            geojson = json.loads(GEOSGeometry(row[0]).geojson)
            return Response(geojson)
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
