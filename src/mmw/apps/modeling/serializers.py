# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework import serializers
from rest_framework_gis import serializers as gis_serializers

from apps.modeling.models import Project, Scenario
from apps.user.serializers import UserSerializer

import json


class JsonField(serializers.BaseSerializer):

    def to_representation(self, obj):
        return json.loads(obj)

    def to_internal_value(self, obj):
        return json.dumps(obj)


class ScenarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Scenario

    inputs = JsonField()
    modifications = JsonField()
    census = JsonField(required=False, allow_null=True)
    aoi_census = JsonField(required=False, allow_null=True)
    modification_censuses = JsonField(required=False, allow_null=True)
    results = JsonField(required=False, allow_null=True)


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
