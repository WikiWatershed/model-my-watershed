# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import \
    Serializer, ListField, CharField, IntegerField, FloatField, DateTimeField


class ResourceLinkSerializer(Serializer):
    href = CharField()
    type = CharField()


class ResourceSerializer(Serializer):
    id = CharField()
    title = CharField()
    description = CharField()
    bbox = ListField(child=FloatField())
    links = ResourceLinkSerializer(many=True)
    created_at = DateTimeField()
    updated_at = DateTimeField()


class ResourceListSerializer(Serializer):
    catalog = CharField()
    api_url = CharField()
    results = ResourceSerializer(many=True)
    count = IntegerField()
