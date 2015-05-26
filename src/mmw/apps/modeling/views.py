# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import json

from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny

from django.shortcuts import get_object_or_404
from django.utils.timezone import now

from celery import chain

from apps.core.models import Job
from apps.core.task_helpers import save_job_error, save_job_result
from apps.modeling import tasks
from apps.modeling.models import District


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
        geojson = json.loads(district.polygon.geojson)
        return Response(geojson)
    else:  # provide list of all ids
        shapes = District.objects.order_by('state_fips', 'district_fips')
        shapes = [{'id': shape.id, 'name': shape.name()} for shape in shapes]
        dictionary = {'shapes': shapes}
        return Response(dictionary)
