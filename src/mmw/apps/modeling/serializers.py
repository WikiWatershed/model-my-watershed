# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers

from apps.modeling.models import Project, Scenario
from apps.user.serializers import UserSerializer

import json


class ModificationsField(serializers.BaseSerializer):

    def to_representation(self, obj):
        return json.loads(obj)

    def to_internal_value(self, obj):
        return json.dumps(obj)


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario

    modifications = ModificationsField()


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
