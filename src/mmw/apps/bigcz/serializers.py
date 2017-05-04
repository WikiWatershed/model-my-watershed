# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import \
    Serializer, CharField, IntegerField, DateTimeField


class ResourceSerializer(Serializer):
    id = CharField()
    title = CharField()
    description = CharField()
    url = CharField()
    created_at = DateTimeField()
    updated_at = DateTimeField()


class ResourceListSerializer(Serializer):
    catalog = CharField()
    results = ResourceSerializer(many=True)
    count = IntegerField()
