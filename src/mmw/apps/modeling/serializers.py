# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.auth.models import User
from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers

from apps.modeling.models import Project, Scenario


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario


class ProjectSerializer(gis_serializers.GeoModelSerializer):
    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'

    user = UserSerializer(default=serializers.CurrentUserDefault())
    scenarios = ScenarioSerializer(many=True, read_only=True)


class ProjectUpdateSerializer(gis_serializers.GeoModelSerializer):
    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'

    user = UserSerializer(default=serializers.CurrentUserDefault(),
                          read_only=True)
