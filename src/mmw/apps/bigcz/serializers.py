# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import \
    Serializer, CharField, DateTimeField, IntegerField, SerializerMethodField
from rest_framework_gis.serializers import GeometryField


class ResourceLinkSerializer(Serializer):
    href = CharField()
    type = CharField()


class ResourceSerializer(Serializer):
    id = CharField()
    title = CharField()
    description = CharField()
    author = CharField()
    links = ResourceLinkSerializer(many=True)
    created_at = DateTimeField()
    updated_at = DateTimeField()
    geom = GeometryField()


class ResourceListSerializer(Serializer):
    catalog = CharField()
    api_url = CharField()
    results = SerializerMethodField()
    count = IntegerField()

    def get_results(self, obj):
        serializer = self.context.get('serializer', ResourceSerializer)
        return [serializer(r).data for r in obj.results]
