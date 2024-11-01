# -*- coding: utf-8 -*-
import rollbar
from django.conf import settings
from django.contrib.gis.geos import (GEOSGeometry,
                                     MultiPolygon)

from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from apps.export.serializers import HydroShareResourceSerializer
from apps.modeling.models import Project, Scenario, WeatherType
from apps.modeling.validation import validate_aoi
from apps.modeling.calcs import get_layer_shape, wkaoi_from_huc
from apps.user.serializers import UserSerializer
from apps.core.models import Job

import json


class JsonField(serializers.BaseSerializer):

    def to_representation(self, obj):
        return json.loads(obj)

    def to_internal_value(self, obj):
        return json.dumps(obj)


class MultiPolygonGeoJsonField(JsonField):
    def to_internal_value(self, data, perimeter=None):
        """
        Accepts string or dict representation
        of a geojson polygon or multipolygon,
        either contained in a feature or standalone.

        Validates the shape can be processed, and
        returns a MultiPolygon geojson string.
        """
        if data == '' or data is None:
            return data

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception:
                raise ValidationError('Area of interest must be valid JSON')

        geometry = data

        try:
            if not isinstance(geometry, GEOSGeometry):
                geometry = data['geometry'] if 'geometry' in data else data
                geometry = GEOSGeometry(json.dumps(geometry))
            geometry.srid = 4326
        except Exception:
            raise ValidationError('Area of interest must ' +
                                  'be valid GeoJSON, of type ' +
                                  'Feature, Polygon or MultiPolygon')

        if geometry.dims != 2:
            raise ValidationError('Area of interest must be a Polygon' +
                                  ' or MultiPolygon')

        if geometry.geom_type == 'Polygon':
            geometry = MultiPolygon(geometry, srid=4326)

        validate_aoi(geometry)

        if perimeter:
            if perimeter not in settings.PERIMETERS:
                raise ValidationError('Invalid perimeter specified: '
                                      f'{perimeter}')

            if not settings.PERIMETERS[perimeter]['geom'].contains(geometry):
                raise ValidationError(
                    'Area of interest must be within '
                    f"{settings.PERIMETERS[perimeter]['label']}")

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
                  'in_drb', 'in_drwi', 'layer_overrides')

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
                  'hydroshare', 'layer_overrides')

    hydroshare = HydroShareResourceSerializer(read_only=True)


class ProjectUpdateSerializer(serializers.ModelSerializer):

    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'
        fields = ('id', 'name', 'area_of_interest', 'area_of_interest_name',
                  'model_package', 'created_at', 'modified_at',
                  'is_private', 'is_activity', 'gis_data', 'mapshed_job_uuid',
                  'subbasin_mapshed_job_uuid', 'wkaoi', 'user',
                  'layer_overrides')

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

    def validate(self, data):
        """
        Ensure that all non-activity projects have a legitimate AoI.
        """
        is_activity = data.get('is_activity', False)

        if not is_activity:
            try:
                # Validate that either AoI or WKAoI is specified correctly
                serializer = AoiSerializer(data=data)
                serializer.is_valid(raise_exception=True)
            except Exception:
                rollbar.report_exc_info()
                raise

        return data


class AoiSerializer(serializers.BaseSerializer):
    def to_internal_value(self, data):
        """
        If the input has an 'area_of_interest' key, return 'area_of_interest'
        to its validated, geojson string representation, and 'wkaoi' as None.
        If the input has a 'wkaoi' key, its shape is pulled from the
        appropriate database, and returned as 'area_of_interest' with the
        value of 'wkaoi' returned unchanged. If the input has a 'huc' key, then
        we use it to look up the 'wkaoi'.

        Args:
        data: Only one of area_of_interest, wkaoi, or huc is necessary
            {
                'area_of_interest': { <geojson dict or string> }
                'wkaoi': '{table}__{id}',
                'huc': '<huc8, huc10, or huc12 id>',
                'perimeter': '<PERIMETERS key>',
            }

        perimeter is optional. If specified, any incoming aoi will be checked
        to see if it is contained within the perimeter. If not, a validation
        error is raised.
        """
        wkaoi = data.get('wkaoi', None)
        huc = data.get('huc', None)
        aoi = data.get('area_of_interest', None)
        perimeter = data.get('perimeter', None)

        if (not aoi and not wkaoi and not huc):
            raise ValidationError(detail='Must supply exactly one of: ' +
                                         'the area of interest (GeoJSON), ' +
                                         'a WKAoI ID, or a HUC.')

        if (huc and not wkaoi):
            wkaoi = wkaoi_from_huc(huc)

        if (wkaoi and not aoi):
            try:
                table, id = wkaoi.split('__')

                if not table or not id:
                    raise ValidationError(
                        'wkaoi must be of the form table__id')
            except Exception:
                raise ValidationError('wkaoi must be of the form table__id')

            aoi = get_layer_shape(table, id)
            if (not aoi):
                raise ValidationError(detail=f'Invalid wkaoi: {wkaoi}')

            huc = aoi['properties'].get('huc')

        aoi_field = MultiPolygonGeoJsonField().to_internal_value(
            aoi, perimeter=perimeter)

        return {
            'area_of_interest': aoi_field,
            'wkaoi': wkaoi,
            'huc': huc,
        }
