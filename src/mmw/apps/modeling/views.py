# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import json

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

from celery import chain

from urlparse import urljoin

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.modeling import tasks
from apps.modeling.models import Project, Scenario
from apps.modeling.serializers import (ProjectSerializer,
                                       ProjectUpdateSerializer,
                                       ScenarioSerializer)


@decorators.api_view(['GET', 'POST'])
@decorators.permission_classes((IsAuthenticated, ))
def projects(request):
    """Get a list of all projects with embedded scenarios available for
       the logged in user.  POST to create a new project associated with the
       logged in user."""
    if request.method == 'GET':
        projects = Project.objects.filter(user=request.user)
        serializer = ProjectSerializer(projects, many=True)

        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ProjectUpdateSerializer(data=request.data,
                                             context={"request": request})
        if serializer.is_valid():
            serializer.save()

            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['DELETE', 'GET', 'PUT'])
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
    area_of_interest = request.POST
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


def _initiate_analyze_job_chain(area_of_interest, job_id):
    return chain(tasks.run_analyze.s(area_of_interest),
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
    job_chain = []

    current_hash = model_input['modification_hash']
    census = model_input.get('census')
    census_hash = None

    if census is not None:
        census_hash = model_input['census'].get('modification_hash')

    if census is None or current_hash != census_hash:
        job_chain.append(tasks.prepare_census.s(model_input))
        job_chain.append(tasks.run_tr55.s(model_input))
    else:
        job_chain.append(tasks.run_tr55.s(census, model_input))

    job_chain.append(save_job_result.s(job_id, model_input))

    return job_chain


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layers(request, table_id=None, obj_id=None):
    layer_list = settings.BOUNDARY_LAYERS
    layer_ids = [layer['code'] for layer in layer_list]

    if not table_id and not obj_id:
        tiler_prefix = '//'
        tiler_host = settings.TILER_HOST
        tiler_postfix = '/{z}/{x}/{y}'
        tiler_base = '%s%s' % (tiler_prefix, tiler_host)

        def augment(dictionary):
            code = dictionary['code']
            return {
                'display': dictionary['display'],
                'tableId': code,
                'endpoint': urljoin(tiler_base, code + tiler_postfix)
            }

        layers = [augment(layer) for layer in layer_list]
        return Response(layers)

    elif table_id in layer_ids and obj_id:
        layers = filter(lambda l: l['code'] == table_id, layer_list)
        table_name = layers[0]['table_name']
        json_field = layers[0].get('json_field', 'geom')

        query = 'SELECT {field} FROM {table} WHERE id = %s'.format(
                field=json_field, table=table_name)

        cursor = connection.cursor()
        cursor.execute(query, [int(obj_id)])
        row = cursor.fetchone()

        if row:
            geojson = json.loads(GEOSGeometry(row[0]).geojson)
            return Response(geojson)
        else:
            return Response(status=status.HTTP_400_BAD_REQUEST)
    else:
        return Response(status=status.HTTP_400_BAD_REQUEST)
