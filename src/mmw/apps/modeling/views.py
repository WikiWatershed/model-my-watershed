# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.permissions import AllowAny, IsAuthenticated

from django.shortcuts import get_object_or_404
from django.utils.timezone import now

from celery import chain

from apps.core.models import Job
from apps.core.task_helpers import save_job_error, save_job_result
from apps.modeling import tasks
from apps.modeling.models import District, Project, Scenario
from apps.modeling.serializers import ProjectSerializer, ScenarioSerializer


@decorators.api_view(['GET', 'POST'])
@decorators.permission_classes((IsAuthenticated, ))
def project_list(request):
    """Get a list of all projects with embedded scenarios available for
       the logged in user.  POST to create a new project associated with the
       logged in user."""
    if request.method == 'GET':
        projects = Project.objects.filter(user=request.user)
        serializer = ProjectSerializer(projects, many=True)

        return Response(serializer.data)

    elif request.method == 'POST':
        serializer = ProjectSerializer(data=request.data,
                                       context={"request": request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['DELETE', 'GET', 'PUT'])
@decorators.permission_classes((IsAuthenticated, ))
def project_detail(request, proj_id):
    """Retrieve, update or delete a project"""
    try:
        project = Project.objects.get(user=request.user, id=proj_id)
    except Project.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ProjectSerializer(project)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ProjectSerializer(project, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        project.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


@decorators.api_view(['POST'])
@decorators.permission_classes((IsAuthenticated, ))
def scenario_list(request):
    """Create a scenario for projects which authenticated user has access to"""
    if request.method == 'POST':
        serializer = ScenarioSerializer(data=request.data,
                                        context={"request": request})

        project_id = serializer.initial_data.get('project')

        try:
            Project.objects.get(id=project_id, user=request.user)
        except Project.DoesNotExist:
            return Response(status=status.HTTP_401_UNAUTHORIZED)

        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors,
                        status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['DELETE', 'GET', 'PUT'])
@decorators.permission_classes((IsAuthenticated, ))
def scenario_detail(request, scen_id):
    """Retrieve, update or delete a scenario"""
    try:
        scenario = Scenario.objects.filter(user=request.user, id=scen_id)
    except Scenario.DoesNotExist:
        return Response(status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        serializer = ScenarioSerializer(scenario)
        return Response(serializer.data)

    elif request.method == 'PUT':
        serializer = ScenarioSerializer(scenario, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        scenario.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


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
    # TODO Validate input data.
    model_input = request.POST
    job = Job.objects.create(created_at=created, result='', error='',
                             traceback='', user=user, status='started')

    task_list = _initiate_tr55_job_chain(model_input, job.id)

    job.uuid = task_list.id
    job.save()

    return Response(
        {
            'job': task_list.id,
            'status': 'started',
        }
    )


def _initiate_tr55_job_chain(model_input, job_id):
    return chain(tasks.make_gt_service_call_task.s(model_input),
                 tasks.run_tr55.s(model_input),
                 save_job_result.s(job_id, model_input)) \
        .apply_async(link_error=save_job_error.s(job_id))


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def district(request, id=None, state=None):
    if id:  # query by unique id
        district = get_object_or_404(District, id=id)
        coordinates = []
        for polygon in district.polygon.coords:
            coordinates.append(polygon[0])
        dictionary = {'type': 'Feature',
                      'properties': {},
                      'geometry': {'type': 'Polygon',
                                   'coordinates': coordinates}}
        return Response(dictionary)
    else:  # provide list of all ids
        shapes = District.objects.order_by('state_fips', 'district_fips')
        shapes = [{'id': shape.id, 'name': shape.name()} for shape in shapes]
        dictionary = {'shapes': shapes}
        return Response(dictionary)
