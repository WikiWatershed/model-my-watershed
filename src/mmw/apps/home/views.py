# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.http import Http404
from django.shortcuts import render_to_response, get_object_or_404
from django.template.context_processors import csrf
from django.conf import settings

from apps.modeling.models import Project


def get_client_settings():
    client_settings = {
        'client_settings': json.dumps({
            'base_layers': settings.BASE_LAYERS
        })
    }
    return client_settings


def get_context(request):
    context = {}
    context.update(csrf(request))
    context.update(get_client_settings())
    return context


def home_page(request):
    return render_to_response('home/home.html', get_context(request))


def project(request, proj_id=None, scenario_id=None):
    """
    If proj_id was specified, check that the user owns
    the project or if the project is public.
    If not, return a 404. Otherwise, just load the index
    template and the let the front-end handle the route
    and request the project through the API.
    """

    if proj_id:
        project = get_object_or_404(Project, id=proj_id)

        if project.user != request.user and project.is_private:
            raise Http404

    return render_to_response('home/home.html', get_context(request))


def compare(request):
    return render_to_response('home/compare.html', get_context(request))
