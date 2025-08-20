# -*- coding: utf-8 -*-
import json
import requests
from urllib.parse import urljoin
from copy import deepcopy
from hs_restclient import HydroShareNotAuthorized

from django.db import transaction, IntegrityError
from django.http import Http404
from django.shortcuts import render, get_object_or_404, redirect
from django.template.context_processors import csrf
from django.utils.timezone import now
from django.conf import settings
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token

from apps.core.models import UnitScheme
from apps.export.hydroshare import HydroShareService
from apps.export.models import HydroShareResource
from apps.modeling.models import Project, Scenario
from apps.user.models import UserProfile, HydroShareToken
from apps.user.countries import COUNTRY_CHOICES


def home_page(request):
    return render(request, 'home/home.html', get_context(request))


def projects(request):
    if request.user.is_authenticated:
        return render(request, 'home/home.html', get_context(request))
    else:
        return redirect('/')


def project(request, proj_id=None, scenario_id=None):
    """
    If proj_id was specified, check that the user owns
    the project or if the project is public.
    If not, return a 404. Otherwise, just load the index
    template and the let the front-end handle the route
    and request the project through the API.

    If proj_id is not specified, then throw a 404 error.
    """

    if proj_id:
        project = get_object_or_404(Project, id=proj_id)

        if project.user != request.user and project.is_private:
            raise Http404

        context = get_context(request)
        context.update({'project': True})

        return render(request, 'home/home.html', context)
    else:
        return redirect('/projects/')


def project_clone(request, proj_id=None):
    """
    If proj_id was specified, check that the user owns
    the project or if the project is public.
    If not, return a 404. Otherwise, create a new
    project and scenarios from the old one, assign to
    current user, and redirect to it.
    """

    if not proj_id or not request.user.is_authenticated:
        raise Http404

    project = get_object_or_404(Project, id=proj_id)

    if project.user != request.user and project.is_private:
        raise Http404

    project.pk = None
    project.user = request.user
    project.save()

    for scenario in Scenario.objects    \
            .filter(project_id=proj_id) \
            .order_by('created_at'):
        scenario.pk = None
        scenario.project = project
        scenario.save()

    return redirect(f'/project/{project.id}')


def _via_hydroshare(request, resource, callback, errback):
    """
    Tries to match a HydroShare resource to a project_id, and if found, calls
    the success callback with it, else calls the error callback. The callback
    is returned to the caller.

    :param request: The Django Request object
    :param resource: String of HydroShare Resource ID
    :param callback: Function that takes project_id and does something
    :param errback: Function that takes nothing and does something
    :return: Output of the called callback
    """

    # Try to match resource to a project
    try:
        hsresource = HydroShareResource.objects.get(resource=resource)
        project_id = hsresource.project_id
    except HydroShareResource.DoesNotExist:
        project_id = None

    if project_id:
        return callback(project_id)

    # If no matching project found, try and fetch project snapshot directly
    snapshot_url = '{base_url}resource/{resource}/{snapshot_path}'.format(
        base_url=settings.HYDROSHARE['base_url'],
        resource=resource,
        snapshot_path='data/contents/mmw_project_snapshot.json')

    response = requests.get(snapshot_url)

    if response.status_code == 200:
        snapshot_json = response.json()
        if snapshot_json:
            project_id = snapshot_json['id'] if 'id' in snapshot_json else None
            if project_id:
                return callback(project_id)

    # If project snapshot couldn't be fetched directly, try fetching it as
    # a HydroShare user. This is useful for cases when an existing resource
    # is copied, since the copy isn't public by default.
    if request.user.is_authenticated:
        # Make sure the user has linked their account to HydroShare
        try:
            HydroShareToken.objects.get(user_id=request.user.id)
        except HydroShareToken.DoesNotExist:
            return errback()

        hss = HydroShareService()
        hs = hss.get_client(request.user.id)

        snapshot_json = hs.get_project_snapshot(resource)
        if snapshot_json:
            project_id = snapshot_json['id'] if 'id' in snapshot_json else None
            if project_id:
                return callback(project_id)

    return errback()


def project_via_hydroshare_open(request, resource):
    """Redirect to project given a HydroShare resource, if found."""

    def callback(project_id):
        return redirect(f'/project/{project_id}/')

    def errback():
        return redirect('/error/hydroshare-not-found')

    return _via_hydroshare(request, resource, callback, errback)


def project_via_hydroshare_edit(request, resource):
    """
    If a user doesn't own a project, copies it to their account.

    There are three ways a user can come to edit a project from HydroShare:

    1. They click "Edit" on their own resource in HydroShare, which they
       themselves had exported to HydroShare from MMW
    2. They click "Edit" on someone else's resource in HydroShare
    3. They click "Edit" on someone else's resource that has been copied to
       their account in HydroShare via HydroShare's "Copy" function.
    4. They "Copy" their own resource in HydroShare and "Edit" it

    In (1), we simply take them to their project. They can edit it as usual.
    In (2), we copy the project to their account and take them to it. They can
    then edit it, and export to HydroShare when ready.
    In (3), we copy the project to their account and associate it with the
    given resource ID.
    In (4), we make another copy of their own project and associate it with the
    given resource ID.
    """

    # Only logged in users are allowed to edit
    if request.user.is_anonymous:
        return redirect('/error/hydroshare-not-logged-in')

    def callback(project_id):
        project = get_object_or_404(Project, id=project_id)

        # Check to see if we should associate with given resource
        try:
            hsresource = HydroShareResource.objects.get(project_id=project_id)
        except HydroShareResource.DoesNotExist:
            hsresource = None

        if hsresource and hsresource.resource == resource:
            # Use case (1). The user owns this exact project, so we show it.
            if request.user == project.user:
                return redirect(f'/project/{project_id}/')

            # Use case (2). This is a different user trying to edit a project
            # they don't own, so we clone it to their account.
            return redirect(f'/project/{project_id}/clone')

        # Use cases (3) and (4). This is a copy in HydroShare that needs a
        # corresponding new copy in MMW. Fetch that resource's details.

        # Make sure the user has linked their account to HydroShare
        try:
            HydroShareToken.objects.get(user_id=request.user.id)
        except HydroShareToken.DoesNotExist:
            return redirect('/error/hydroshare-not-found')

        hss = HydroShareService()
        hs = hss.get_client(request.user.id)

        # Get specified resource info
        hstitle = hs.getSystemMetadata(resource)['resource_title']
        snapshot = hs.get_project_snapshot(resource)

        try:
            with transaction.atomic():
                # Copy the project
                project.pk = None
                project.user = request.user
                project.save()

                # Copy each scenario
                for scenario in Scenario.objects \
                        .filter(project_id=project_id) \
                        .order_by('created_at'):
                    scenario.pk = None
                    scenario.project = project
                    scenario.save()

                # If the current user owns that resource on HydroShare,
                # update it to point to new project and map project to it
                try:
                    # Update project snapshot to refer to new project
                    snapshot['id'] = project.id
                    hs.add_files(resource, [{
                        'name': 'mmw_project_snapshot.json',
                        'contents': json.dumps(snapshot),
                    }], overwrite=True)

                    # Create a HydroShareResource mapping
                    hsr = HydroShareResource.objects.create(
                        project=project,
                        resource=resource,
                        title=hstitle,
                        autosync=False,
                        exported_at=now(),
                    )
                    hsr.save()
                except HydroShareNotAuthorized:
                    # If the current user cannot update the resource
                    # from which this project was created, don't associate it
                    pass

                return redirect(f'/project/{project.id}')

        except IntegrityError:
            return redirect('/error/hydroshare-not-found')

    def errback():
        return redirect('/error/hydroshare-not-found')

    return _via_hydroshare(request, resource, callback, errback)


def get_layer_url(layer):
    """ For layers that are served off our tile server,
    the URL depends on the environment. Therefore, we
    get it dynamically from the settings file and populate
    the layer config with the endpoint.
    """
    tiler_prefix = '//'
    tiler_host = settings.TILER_HOST
    tiler_postfix = '/{z}/{x}/{y}'
    tiler_base = '%s%s' % (tiler_prefix, tiler_host)

    return urljoin(tiler_base, layer['code'] + tiler_postfix)


def get_model_packages():
    for model_package in settings.MODEL_PACKAGES:
        if model_package['name'] in settings.DISABLED_MODEL_PACKAGES:
            model_package['disabled'] = True
    return settings.MODEL_PACKAGES


def create_layer_config_with_urls(layer_type):
    layers = deepcopy(settings.LAYER_GROUPS[layer_type])
    [set_url(layer) for layer in layers
        if 'url' not in layer and 'table_name' in layer]
    return layers


def set_url(layer):
    layer.update({'url': get_layer_url(layer)})


def get_api_token():
    try:
        client_app_user = User.objects.get(
            username=settings.CLIENT_APP_USERNAME)
        token = Token.objects.get(user=client_app_user)
        return token.key
    except (User.DoesNotExist, Token.DoesNotExist):
        return None


def get_client_settings(request):
    # BiG-CZ mode applies when either request host contains predefined host, or
    # ?bigcz query parameter is present. This covers staging sites, etc.
    bigcz = settings.BIGCZ_HOST in request.get_host() or 'bigcz' in request.GET
    favicon = 'favicon-bigcz' if bigcz else 'favicon'
    title = 'BiG CZ Data Portal' if bigcz else 'Model My Watershed'
    max_area = settings.BIGCZ_MAX_AREA if bigcz else settings.MMW_MAX_AREA
    EMBED_FLAG = settings.ITSI['embed_flag']

    unit_scheme = UnitScheme.METRIC
    if request.user.is_authenticated:
        try:
            profile = UserProfile.objects.get(user=request.user)
            unit_scheme = profile.unit_scheme
        except UserProfile.DoesNotExist:
            pass

    client_settings = {
        'client_settings': json.dumps({
            EMBED_FLAG: request.session.get(EMBED_FLAG, False),
            'base_layers': create_layer_config_with_urls('basemap'),
            'boundary_layers': create_layer_config_with_urls('boundary'),
            'coverage_layers': create_layer_config_with_urls('coverage'),
            'stream_layers': create_layer_config_with_urls('stream'),
            'nhd_perimeter': settings.PERIMETERS['NHD']['json'],
            'conus_perimeter': settings.PERIMETERS['CONUS']['json'],
            'drwi_simple_perimeter': settings.PERIMETERS['DRWI']['json'],
            'pa_simple_perimeter': settings.PERIMETERS['PA_SIMPLE']['json'],
            'draw_tools': settings.DRAW_TOOLS,
            'map_controls': settings.MAP_CONTROLS,
            'vizer_urls': settings.VIZER_URLS,
            'vizer_ignore': settings.VIZER_IGNORE,
            'vizer_names': settings.VIZER_NAMES,
            'model_packages': get_model_packages(),
            'max_area': max_area,
            'mapshed_max_area': settings.GWLFE_CONFIG['MaxAoIArea'],
            'data_catalog_enabled': bigcz,
            'data_catalog_page_size': settings.BIGCZ_CLIENT_PAGE_SIZE,
            'sso_enabled': not bigcz,
            'title': title,
            'api_token': get_api_token(),
            'choices': {
                'UserProfile': {
                    'user_type': UserProfile.USER_TYPE_CHOICES,
                    'country': COUNTRY_CHOICES,
                    'unit_scheme': UserProfile.UNIT_SCHEME_CHOICES,
                }
            },
            'enabled_features': settings.ENABLED_FEATURES,
            'unit_scheme': unit_scheme,
            'celery_task_time_limit': settings.CELERY_TASK_TIME_LIMIT,
        }),
        'google_maps_api_key': settings.GOOGLE_MAPS_API_KEY,
        'title': title,
        'favicon': favicon + '.png',
        'favicon2x': favicon + '@2x.png',
    }

    return client_settings


def get_context(request):
    context = {
        'project': False,
        'GOOGLE_ANALYTICS_ACCOUNT': settings.GOOGLE_ANALYTICS_ACCOUNT,
    }
    context.update(csrf(request))
    context.update(get_client_settings(request))

    return context
