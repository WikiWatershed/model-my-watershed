# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.gis.geos import (GEOSGeometry,
                                     MultiPolygon)

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.export.serializers import HydroShareResourceSerializer
from apps.modeling.models import Project, Scenario, WeatherType
from apps.modeling.validation import validate_aoi
from apps.modeling.calcs import get_layer_shape
from apps.user.serializers import UserSerializer
from apps.core.models import Job

import json


class JsonField(serializers.BaseSerializer):

    def to_representation(self, obj):
        return json.loads(obj)

    def to_internal_value(self, obj):
        return json.dumps(obj)


class MultiPolygonGeoJsonField(JsonField):
    def to_internal_value(self, data):
        """
        Accepts string or dict representation
        of a geojson polygon or multipolygon,
        either contained in a feature or standalone.

        Validates the shape can be processed, and
        returns a MultiPolygon geojson string.
        """
        if data == '' or data is None:
            return data
        if isinstance(data, basestring):
            data = json.loads(data)

        geom = data['geometry'] if 'geometry' in data else data

        try:
            geometry = GEOSGeometry(json.dumps(geom), srid=4326)
        except:
            raise ValidationError('Area of interest must ' +
                                  'be valid GeoJSON, of type ' +
                                  'Feature, Polygon or MultiPolygon')

        if geometry.dims != 2:
            raise ValidationError('Area of interest must be a Polygon' +
                                  ' or MultiPolygon')

        if geometry.geom_type == 'Polygon':
            geometry = MultiPolygon(geometry, srid=4326)

        validate_aoi(geometry)

        return geometry.geojson


class ScenarioSerializer(serializers.ModelSerializer):

    class Meta:
        model = Scenario
        fields = ('id', 'name', 'project', 'is_current_conditions', 'inputs',
                  'inputmod_hash', 'modifications', 'modification_hash',
                  'aoi_census', 'modification_censuses', 'results',
                  'created_at', 'modified_at', 'weather_type',
                  'weather_simulation', 'weather_custom')
        read_only_fields = ('weather_custom',)

    inputs = JsonField()
    modifications = JsonField()
    aoi_census = JsonField(required=False, allow_null=True)
    modification_censuses = JsonField(required=False, allow_null=True)
    results = JsonField(required=False, allow_null=True)

    def validate_weather_type(self, value):
        if value == WeatherType.CUSTOM and \
                not self.instance.weather_custom:
            raise ValidationError('Cannot use Custom Weather Data: '
                                  'none specified.')

        if value != WeatherType.DEFAULT and \
                self.instance.is_current_conditions:
            raise ValidationError('Cannot use non-Default Weather Data '
                                  'with Current Conditions')

        return value

    def validate_weather_simulation(self, value):
        if value and value not in WeatherType.simulations:
            raise ValidationError('Cannot use Simulation Weather Data: '
                                  'invalid simulation.')

        return value


class ProjectSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'
        fields = ('id', 'name', 'area_of_interest', 'area_of_interest_name',
                  'scenarios', 'model_package', 'created_at', 'modified_at',
                  'is_private', 'is_activity', 'gis_data', 'mapshed_job_uuid',
                  'subbasin_mapshed_job_uuid', 'wkaoi', 'user', 'hydroshare',
                  'in_drb')

    user = UserSerializer(default=serializers.CurrentUserDefault())
    gis_data = JsonField(required=False, allow_null=True)
    mapshed_job_uuid = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Job.objects.all(),
        required=False,
        allow_null=True)
    subbasin_mapshed_job_uuid = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Job.objects.all(),
        required=False,
        allow_null=True)
    scenarios = ScenarioSerializer(many=True, read_only=True)
    hydroshare = HydroShareResourceSerializer(read_only=True)


class ProjectListingSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        fields = ('id', 'name', 'area_of_interest_name', 'is_private',
                  'model_package', 'created_at', 'modified_at', 'user',
                  'hydroshare')

    hydroshare = HydroShareResourceSerializer(read_only=True)


class ProjectUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'
        fields = ('id', 'name', 'area_of_interest', 'area_of_interest_name',
                  'model_package', 'created_at', 'modified_at',
                  'is_private', 'is_activity', 'gis_data', 'mapshed_job_uuid',
                  'subbasin_mapshed_job_uuid', 'wkaoi', 'user')

    user = UserSerializer(default=serializers.CurrentUserDefault(),
                          read_only=True)
    gis_data = JsonField(required=False, allow_null=True)
    mapshed_job_uuid = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Job.objects.all(),
        required=False,
        allow_null=True)
    subbasin_mapshed_job_uuid = serializers.SlugRelatedField(
        slug_field='uuid',
        queryset=Job.objects.all(),
        required=False,
        allow_null=True)

    def create(self, validated_data):
        """
        Override ``create`` to provide a user via request.user by default.
        This is required since the read_only ``user`` field is not included by
        default anymore since
        https://github.com/encode/django-rest-framework/pull/5886

        From https://github.com/lock8/django-rest-framework-jwt-refresh-token/pull/35/files#diff-84229b1d4af72d928beddfa32e80cc8eR23  # NOQA
        via https://github.com/encode/django-rest-framework/issues/6031#issuecomment-398242587  # NOQA
        """
        if 'user' not in validated_data:
            validated_data['user'] = self.context['request'].user

        return super(ProjectUpdateSerializer, self).create(validated_data)


class AoiSerializer(serializers.BaseSerializer):
    def to_internal_value(self, data):
        """
        If the input has an 'area_of_interest' key, return 'area_of_interest'
        to its validated, geojson string representation, and 'wkaoi' as None.
        If the input has a 'wkaoi' key, its shape is pulled from the
        appropriate database, and returned as 'area_of_interest' with the
        value of 'wkaoi' returned unchanged.

        Args:
        data: Only one of the keys is necessary
            {
                'area_of_interest': { <geojson dict or string> }
                'wkaoi': '{table}__{id}',
            }
        """
        wkaoi = data.get('wkaoi', None)
        aoi = data.get('area_of_interest', None)

        if (not aoi and not wkaoi):
            raise ValidationError(detail='Must supply either ' +
                                         'the area of interest (GeoJSON), ' +
                                         'or a WKAoI ID.')

        if (wkaoi and not aoi):
            try:
                table, id = wkaoi.split('__')
            except:
                raise ValidationError('wkaoi must be of the form table__id')

            aoi = get_layer_shape(table, id)
            if (not aoi):
                raise ValidationError(detail='Invalid wkaoi: {}'.format(wkaoi))

        aoi_field = MultiPolygonGeoJsonField().to_internal_value(aoi)

        return {
            'area_of_interest': aoi_field,
            'wkaoi': wkaoi
        }
