# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json
from urlparse import urljoin

from django.http import Http404
from django.shortcuts import render_to_response, get_object_or_404, redirect
from django.template.context_processors import csrf
from django.conf import settings

from apps.modeling.models import Project, Scenario


def home_page(request):
    return render_to_response('home/home.html', get_context(request))


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

        return render_to_response('home/home.html', get_context(request))
    else:
        raise Http404


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


def get_layer_config(layerKey):
    """ Retrieves the configuration for the provided
    layer type. layerKey is a string that should be a
    key and set to True for each layer that should
    be returned.
    """
    selected_layers = []

    for layer in settings.LAYERS:
        if layerKey in layer and layer[layerKey]:
            # Populate the layer url for layers that we host
            if 'url' not in layer and 'table_name' in layer:
                layer['url'] = get_layer_url(layer)

            # Add only the layers we want based on layerKey
            selected_layers.append(layer)

    return selected_layers


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


def get_client_settings(request):
    EMBED_FLAG = settings.ITSI['embed_flag']

    client_settings = {
        'client_settings': json.dumps({
            EMBED_FLAG: request.session.get(EMBED_FLAG, False),
            'base_layers': get_layer_config('basemap'),
            'stream_layers': get_layer_config('stream'),
            'boundary_layers': get_layer_config('boundary'),
            'google_maps_api_key': settings.GOOGLE_MAPS_API_KEY
        })
    }

    return client_settings


def get_context(request):
    context = {}
    context.update(csrf(request))
    context.update(get_client_settings(request))

    return context
