# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json
import requests
from urlparse import urljoin
from copy import deepcopy

from django.http import Http404
from django.shortcuts import render_to_response, get_object_or_404, redirect
from django.template import RequestContext
from django.template.context_processors import csrf
from django.conf import settings
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token

from apps.export.hydroshare import HydroShareService
from apps.export.models import HydroShareResource
from apps.modeling.models import Project, Scenario
from apps.user.models import UserProfile, HydroShareToken
from apps.user.countries import COUNTRY_CHOICES


def home_page(request):
    return render_to_response('home/home.html', get_context(request))


def projects(request):
    if request.user.is_authenticated():
        return render_to_response('home/home.html', get_context(request))
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

        return render_to_response('home/home.html', context)
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

    if not proj_id or not request.user.is_authenticated():
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

    return redirect('/project/{0}'.format(project.id))


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
    if request.user.is_authenticated():
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
        return redirect('/project/{}/'.format(project_id))

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
    except User.DoesNotExist, Token.DoesNotExist:
        return None


def get_client_settings(request):
    # BiG-CZ mode applies when either request host contains predefined host, or
    # ?bigcz query parameter is present. This covers staging sites, etc.
    bigcz = settings.BIGCZ_HOST in request.get_host() or 'bigcz' in request.GET
    favicon = 'favicon-bigcz' if bigcz else 'favicon'
    title = 'BiG CZ Data Portal' if bigcz else 'Model My Watershed'
    max_area = settings.BIGCZ_MAX_AREA if bigcz else settings.MMW_MAX_AREA
    EMBED_FLAG = settings.ITSI['embed_flag']
    client_settings = {
        'client_settings': json.dumps({
            EMBED_FLAG: request.session.get(EMBED_FLAG, False),
            'base_layers': create_layer_config_with_urls('basemap'),
            'boundary_layers': create_layer_config_with_urls('boundary'),
            'coverage_layers': create_layer_config_with_urls('coverage'),
            'stream_layers': create_layer_config_with_urls('stream'),
            'nhd_perimeter': settings.NHD_REGION2_PERIMETER,
            'conus_perimeter': settings.CONUS_PERIMETER,
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
            'itsi_enabled': not bigcz,
            'title': title,
            'api_token': get_api_token(),
            'choices': {
                'UserProfile': {
                    'user_type': UserProfile.USER_TYPE_CHOICES,
                    'country': COUNTRY_CHOICES,
                }
            },
            'enabled_features': settings.ENABLED_FEATURES,
        }),
        'google_maps_api_key': settings.GOOGLE_MAPS_API_KEY,
        'title': title,
        'favicon': favicon + '.png',
        'favicon2x': favicon + '@2x.png',
    }

    return client_settings


def get_context(request):
    context = RequestContext(request)
    context.update(csrf(request))
    context.update(get_client_settings(request))

    return context
