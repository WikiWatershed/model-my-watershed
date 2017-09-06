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
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    return start_celery_job([
        tasks.analyze_animals.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_pointsource(request, format=None):
    user = request.user if request.user.is_authenticated() else None

    wkaoi = request.query_params.get('wkaoi', None)
    area_of_interest = load_area_of_interest(request.data, wkaoi)

    return start_celery_job([
        tasks.analyze_pointsource.s(area_of_interest)
    ], area_of_interest, user)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def start_analyze_catchment_water_quality(request, format=None):
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
