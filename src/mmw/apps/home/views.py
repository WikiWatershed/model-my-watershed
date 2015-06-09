# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.http import Http404
from django.contrib.auth.models import User
from django.shortcuts import render_to_response, get_object_or_404
from django.template.context_processors import csrf
from rest_framework import serializers, viewsets
from apps.modeling.models import Project


# Serializers define the API representation.
class UserSerializer(serializers.HyperlinkedModelSerializer):
    class Meta:
        model = User
        fields = ('url', 'username', 'email', 'is_staff')


# ViewSets define the view behavior.
class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer


def home_page(request):
    csrf_token = {}
    csrf_token.update(csrf(request))

    return render_to_response('home/home.html', csrf_token)


def model(request, proj_id=None):
    """
    If proj_id was specified, check that the user owns
    the project or if the project is public.
    If not, return a 404. Otherwise, just load the index
    template and the let the front-end handle the route
    and request the project through the API.
    """
    csrf_token = {}
    csrf_token.update(csrf(request))

    if proj_id:
        project = get_object_or_404(Project, id=proj_id)

        if project.user != request.user and project.is_private:
            raise Http404

    return render_to_response('home/home.html', csrf_token)


def compare(request):
    return render_to_response('home/compare.html')
