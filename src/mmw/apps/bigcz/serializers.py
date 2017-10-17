# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from math import ceil

from rest_framework.serializers import \
    Serializer, CharField, DateTimeField, IntegerField, SerializerMethodField
from rest_framework_gis.serializers import GeometryField
from rest_framework.utils.urls import remove_query_param, replace_query_param

from django.conf import settings


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
    page = SerializerMethodField()
    previous = SerializerMethodField()
    next = SerializerMethodField()

    def get_results(self, obj):
        serializer = self.context.get('serializer', ResourceSerializer)
        return [serializer(r).data for r in obj.results]

    def get_page(self, obj):
        if not self.context.get('is_pageable', False):
            return None

        return self.context.get('page')

    def get_previous(self, obj):
        request_uri = self.context.get('request_uri')
        page = self.context.get('page')

        if not request_uri:
            return None

        if not self.context.get('is_pageable', False):
            return None

        if page < 2:
            return None

        if page == 2:
            return remove_query_param(request_uri, 'page')

        return replace_query_param(request_uri, 'page', page - 1)

    def get_next(self, obj):
        request_uri = self.context.get('request_uri')
        page = self.context.get('page')

        if not request_uri:
            return None

        if not self.context.get('is_pageable', False):
            return None

        last_page = ceil(obj.count / settings.BIGCZ_CLIENT_PAGE_SIZE)

        if page >= last_page:
            return None

        return replace_query_param(request_uri, 'page', page + 1)
