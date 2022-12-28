# -*- coding: utf-8 -*-
import json
import rollbar
from contextlib import closing
from urllib.parse import unquote

from celery import chain, group

from rest_framework.response import Response
from rest_framework import decorators, status
from rest_framework.exceptions import ValidationError
from rest_framework.authentication import (SessionAuthentication,
                                           TokenAuthentication)
from rest_framework.permissions import (AllowAny,
                                        IsAuthenticated,
                                        IsAuthenticatedOrReadOnly)
from drf_yasg.utils import swagger_auto_schema

from django.shortcuts import get_object_or_404
from django.utils.timezone import now
from django.db import connection
from django.core.exceptions import EmptyResultSet
from django.http import (HttpResponse,
                         Http404,
                         )

from wsgiref.util import FileWrapper

from apps.core.models import Job
from apps.core.tasks import save_job_error, save_job_result
from apps.core.decorators import log_request
from apps.geoprocessing_api.schemas import JOB_RESPONSE
from apps.modeling import tasks, geoprocessing
from apps.modeling.mapshed.tasks import (multi_subbasin,
                                         multi_mapshed,
                                         convert_data,
                                         collect_data,
                                         collect_subbasin,
                                         )
from apps.modeling.models import Project, Scenario, WeatherType
from apps.modeling.serializers import (ProjectSerializer,
                                       ProjectListingSerializer,
                                       ProjectUpdateSerializer,
                                       ScenarioSerializer,
                                       AoiSerializer)
from apps.modeling.calcs import (get_layer_shape,
                                 get_huc12s,
                                 get_catchments,
                                 apply_gwlfe_modifications,
                                 boundary_search_context,
                                 split_into_huc12s,
                                 sum_subbasin_stream_lengths,
                                 get_weather_modifications,
                                 get_weather_simulation_for_project,
                                 )


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


@decorators.api_view(['GET'])
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def project_weather(request, proj_id, category):
    """
    Get weather data for project given a category, if available.

    Current categories are NASA_NLDAS_2000_2019, RCP45_2080_2099 and
    RCP85_2080_2099, and only support shapes within the DRB. Given a project
    within the DRB, we find the N=2 nearest weather stations and
    average their values.
    """
    project = get_object_or_404(Project, id=proj_id, user=request.user)

    if category not in WeatherType.simulations:
        return Response({'errors': ['Invalid category specified.']},
                        status=status.HTTP_400_BAD_REQUEST)

    if category == 'NASA_NLDAS_2000_2019' and not project.in_drwi:
        return Response({'errors': ['Only supported within'
                                    ' Delware River Watershed Initiative.']},
                        status=status.HTTP_400_BAD_REQUEST)

    if category in ['RCP45_2080_2099', 'RCP85_2080_2099'] \
            and not project.in_drb:
        return Response({'errors': ['Only supported within'
                                    ' Delware River Basin.']},
                        status=status.HTTP_400_BAD_REQUEST)

    # Get weather simulation data for this project
    mods, errs = get_weather_simulation_for_project(project, category)

    # Report errors as server side, since they are fault with our
    # built-in data
    if errs:
        rollbar.report_message(f'Weather Data Errors: {errs}', 'error')
        return Response({'errors': errs},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    # Return response, and cache it for a long time, because it is constant
    # for a project and category
    return Response({'output': mods},
                    headers={'Cache-Control': 'max-age: 604800'})


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
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def scenario_duplicate(request, scen_id):
    """Duplicate a scenario."""
    scenario = get_object_or_404(Scenario, id=scen_id)

    if scenario.project.user != request.user:
        return Response(status=status.HTTP_404_NOT_FOUND)

    scenario.pk = None
    scenario.is_current_conditions = False

    # Give the scenario a new name. Same logic as in
    # modeling/models.js:makeNewScenarioName.
    names = scenario.project.scenarios.values_list('name', flat=True)
    copy_name = f'Copy of {scenario.name}'
    copy_counter = 1

    while copy_name in names:
        copy_name = f'Copy of {scenario.name} {copy_counter}'
        copy_counter += 1

    scenario.name = copy_name
    scenario.save()

    serializer = ScenarioSerializer(scenario)

    return Response(serializer.data, status=status.HTTP_201_CREATED)


@decorators.api_view(['GET', 'POST', 'DELETE'])
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def scenario_custom_weather_data(request, scen_id):
    """
    Given a scenario id, creates, retrieves, or deletes custom weather.

    GET from owners or on public projects will return the weather data if
    available, else 404. Errors will be reported alongside the weather data.

    POST from owners will validate and save new weather data, overwriting any
    existing data. Errors will be reported as 400s.

    DELETE from owners will remove the custom weather data.
    """
    scenario = get_object_or_404(Scenario, id=scen_id)
    project = scenario.project

    if request.method == 'GET':
        if project.user.id != request.user.id and project.is_private:
            return Response(status=status.HTTP_404_NOT_FOUND)

        if not scenario.weather_custom.name:
            return Response(status=status.HTTP_404_NOT_FOUND)

        with closing(scenario.weather_custom):
            mods, errs = get_weather_modifications(scenario.weather_custom)

        return Response({'output': mods, 'errors': errs,
                         'file_name': scenario.weather_custom.name})

    elif project.user.id == request.user.id:
        errors = []

        if request.method == 'POST':

            if not request.FILES or 'weather' not in request.FILES:
                errors.append('Must specify file in `weather` field.')

            if errors:
                return Response({'errors': errors},
                                status=status.HTTP_400_BAD_REQUEST)

            scenario.weather_custom = request.FILES['weather']

            mods, errs = get_weather_modifications(
                scenario.weather_custom)

            if errs:
                return Response({'errors': errors + errs},
                                status=status.HTTP_400_BAD_REQUEST)

            scenario.save()
            return Response({'output': mods,
                             'file_name': scenario.weather_custom.name})

        elif request.method == 'DELETE':
            if scenario.weather_custom.name:
                # Check if any other scenarios use the same weather file
                others = (scenario.project.scenarios
                          .exclude(id=scenario.id)
                          .filter(weather_type=WeatherType.CUSTOM,
                                  weather_custom=scenario.weather_custom)
                          .values_list('name', flat=True))

                if others.count() > 0:
                    errors.append('Cannot delete weather file.'
                                  ' It is also used in: "{}".'
                                  ' Either delete those scenarios, or set them'
                                  ' to use Available Data before deleting'
                                  ' the custom weather file.'.format(
                                      '", "'.join(others)))
                    return Response({'errors': errors},
                                    status=status.HTTP_400_BAD_REQUEST)

                # Delete file from all scenarios not actively using it
                passives = (scenario.project.scenarios
                            .exclude(id=scenario.id,
                                     weather_type=WeatherType.CUSTOM)
                            .filter(weather_custom=scenario.weather_custom))

                for s in passives:
                    s.weather_custom.delete()
                    s.save()

                # Delete file from given scenario
                scenario.weather_custom.delete()

            scenario.weather_type = WeatherType.DEFAULT
            scenario.save()
            return Response(None,
                            status=status.HTTP_204_NO_CONTENT)

    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['GET'])
@decorators.permission_classes((IsAuthenticatedOrReadOnly, ))
def scenario_custom_weather_data_download(request, scen_id):
    """
    Given a scenario id retrieves the custom weather data file if available.
    """
    scenario = get_object_or_404(Scenario, id=scen_id)
    project = scenario.project

    if project.user.id != request.user.id and project.is_private:
        return Response(status=status.HTTP_404_NOT_FOUND)

    cwd = scenario.weather_custom
    if not cwd.name:
        return Response(status=status.HTTP_404_NOT_FOUND)

    filename = cwd.name.split('/')[-1]
    response = HttpResponse(cwd, content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename={filename}'
    return response


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
    user = request.user if request.user.is_authenticated else None
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

    stream_lengths = sum_subbasin_stream_lengths(model_input)

    # Create a celery group where each task in the group
    # runs gwlfe synchronously on a chunk of subbasin ids.
    # This is to keep the number of tasks in the group low. Celery will
    # not return the aggregate chain's job_id (which we need for the job
    # submission response) until all tasks have been submitted.
    # If we don't chunk, a shape that has 60+ subbasins could take >60sec
    # to generate a response (and thus timeout) because we'll be waiting to
    # submit one task for each subbasin.
    gwlfe_chunked_group = group([
        tasks.run_subbasin_gwlfe_chunks.s(mapshed_job_uuid,
                                          modifications,
                                          stream_lengths,
                                          inputmod_hash,
                                          watershed_id_chunk)
        .set(link_error=errback)
        for watershed_id_chunk in watershed_id_chunks])

    job_chain = (
        gwlfe_chunked_group |
        tasks.subbasin_results_to_dict.s().set(link_error=errback) |
        tasks.run_srat.s(mapshed_job_uuid).set(link_error=errback) |
        save_job_result.s(job_id, mapshed_job_uuid))

    return chain(job_chain).apply_async()


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
    user = request.user if request.user.is_authenticated else None
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

    layer_overrides = mapshed_input.get('layer_overrides', {})

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

    job_chain = (multi_subbasin(area_of_interest, huc12s, layer_overrides) |
                 collect_subbasin.s(huc12s, layer_overrides=layer_overrides) |
                 tasks.subbasin_results_to_dict.s() |
                 save_job_result.s(job_id, mapshed_input))

    return job_chain.apply_async(link_error=errback)


def _initiate_mapshed_job_chain(mapshed_input, job_id):
    errback = save_job_error.s(job_id)

    area_of_interest, wkaoi = _parse_input(mapshed_input)

    layer_overrides = mapshed_input.get('layer_overrides', {})

    job_chain = (
        multi_mapshed(area_of_interest, wkaoi, layer_overrides) |
        convert_data.s(wkaoi) |
        collect_data.s(area_of_interest, layer_overrides=layer_overrides) |
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
    response['Content-Disposition'] = f'attachment; filename={filename}.gms'
    return response


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
@log_request
def start_tr55(request, format=None):

    user = request.user if request.user.is_authenticated else None
    created = now()

    model_input = request.data.get('model_input')
    if not model_input:
        return Response('Missing model_input',
                        status=status.HTTP_400_BAD_REQUEST)

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
    layer_overrides = model_input.get('layer_overrides', {})
    # Default to NLCD 2011 unless explicitly specified otherwise
    layer_overrides['__LAND__'] = layer_overrides.get(
        '__LAND__', 'nlcd-2011-30m-epsg5070-512-int8')
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
        job_chain.append(tasks.nlcd_soil_tr55.s())

        if aoi_census and pieces:
            polygons = [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}

            job_chain.insert(
                0,
                geoprocessing.run.s('nlcd_soil_tr55',
                                    geop_input,
                                    layer_overrides=layer_overrides))
            job_chain.append(tasks.run_tr55.s(aoi, model_input,
                                              cached_aoi_census=aoi_census))
        else:
            polygons = [aoi] + [m['shape']['geometry'] for m in pieces]
            geop_input = {'polygon': [json.dumps(p) for p in polygons]}
            # Use WKAoI only if there are no pieces to modify the AoI
            wkaoi = wkaoi if not pieces else None

            job_chain.insert(
                0,
                geoprocessing.run.s('nlcd_soil_tr55',
                                    geop_input,
                                    wkaoi,
                                    layer_overrides=layer_overrides))
            job_chain.append(tasks.run_tr55.s(aoi, model_input))

    job_chain.append(save_job_result.s(job_id, model_input))

    return job_chain


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def subbasins_detail(request):
    mapshed_job_uuid = request.query_params.get('mapshed_job_uuid')
    mapshed_job = Job.objects.get(uuid=mapshed_job_uuid)
    gmss = json.loads(mapshed_job.result)
    if gmss:
        huc12s = get_huc12s(gmss.keys())
        return Response(huc12s)
    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def subbasin_catchments_detail(request):
    encoded_comids = request.query_params.get('catchment_comids')
    catchment_comids = json.loads(unquote(encoded_comids))
    if catchment_comids and len(catchment_comids) > 0:
        catchments = get_catchments(catchment_comids)
        return Response(catchments)
    else:
        return Response(status=status.HTTP_404_NOT_FOUND)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def boundary_layer_detail(request, table_code, obj_id):
    geojson = get_layer_shape(table_code, obj_id)

    if geojson:
        return Response(geojson)
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

    point_source_results = {'type': 'FeatureCollection', 'features': []}

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

    return Response(point_source_results,
                    headers={'Cache-Control': 'max-age: 604800'})


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def weather_stations(request):
    query = '''
          WITH features AS (
              SELECT jsonb_build_object(
                  'type',       'Feature',
                  'id',         ogc_fid,
                  'geometry',   ST_AsGeoJSON(geom)::jsonb,
                  'properties', to_jsonb(ws) - 'ogc_fid' - 'geom'
              ) AS feature
              FROM (SELECT * FROM ms_weather_station) AS ws
          )

          SELECT jsonb_build_object(
              'type',     'FeatureCollection',
              'features', jsonb_agg(features.feature)
          )
          FROM features;
          '''

    with connection.cursor() as cursor:
        cursor.execute(query)
        result = cursor.fetchall()[0][0]

    return HttpResponse(result,
                        content_type='application/json',
                        headers={'Cache-Control': 'max-age: 604800'})


@swagger_auto_schema(method='get',
                     responses={200: JOB_RESPONSE})
@decorators.api_view(['GET'])
@decorators.authentication_classes((SessionAuthentication,
                                    TokenAuthentication, ))
@decorators.permission_classes((AllowAny, ))
@log_request
def get_job(request, job_uuid, format=None):
    """
    Get a job's status. If it's complete, get its result.
    """
    # TODO consider if we should have some sort of session id check to ensure
    # you can only view your own jobs.
    try:
        job = Job.objects.get(uuid=job_uuid)
    except Job.DoesNotExist:
        raise Http404("Not found.")

    # Get the user so that logged in users can only see jobs that they started
    # or anonymous ones
    user = request.user if request.user.is_authenticated else None
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
