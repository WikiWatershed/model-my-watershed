# -*- coding: utf-8 -*-
from rest_framework import serializers

from apps.export.models import HydroShareResource


class HydroShareResourceSerializer(serializers.ModelSerializer):

    class Meta:
        model = HydroShareResource
        fields = ('id', 'project', 'resource', 'title', 'autosync',
                  'exported_at', 'created_at', 'modified_at', 'url')

    url = serializers.ReadOnlyField()
