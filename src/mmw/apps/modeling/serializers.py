# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.gis.geos import (GEOSGeometry,
                                     MultiPolygon)

from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework_gis import serializers as gis_serializers

from apps.export.serializers import HydroShareResourceSerializer
from apps.modeling.models import Project, Scenario
from apps.modeling.validation import validate_aoi
from apps.modeling.calcs import get_layer_shape
from apps.user.serializers import UserSerializer

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

    inputs = JsonField()
    modifications = JsonField()
    aoi_census = JsonField(required=False, allow_null=True)
    modification_censuses = JsonField(required=False, allow_null=True)
    results = JsonField(required=False, allow_null=True)


class ProjectSerializer(gis_serializers.GeoModelSerializer):

    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'

    user = UserSerializer(default=serializers.CurrentUserDefault())
    gis_data = JsonField(required=False, allow_null=True)
    scenarios = ScenarioSerializer(many=True, read_only=True)
    hydroshare = HydroShareResourceSerializer(read_only=True)


class ProjectListingSerializer(gis_serializers.GeoModelSerializer):

    class Meta:
        model = Project
        fields = ('id', 'name', 'area_of_interest_name', 'is_private',
                  'model_package', 'created_at', 'modified_at', 'user',
                  'hydroshare')

    hydroshare = HydroShareResourceSerializer(read_only=True)


class ProjectUpdateSerializer(gis_serializers.GeoModelSerializer):

    class Meta:
        model = Project
        depth = 1
        geo_field = 'area_of_interest'

    user = UserSerializer(default=serializers.CurrentUserDefault(),
                          read_only=True)
    gis_data = JsonField(required=False, allow_null=True)


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
