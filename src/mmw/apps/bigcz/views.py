# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework import decorators
from rest_framework.exceptions import ValidationError, ParseError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.bigcz.clients import CATALOGS
from apps.bigcz.serializers import ResourceListSerializer
from apps.bigcz.utils import parse_date


def _do_search(request):
    catalog = request.query_params.get('catalog')
    page = int(request.query_params.get('page', 1))
    request_uri = request.build_absolute_uri()

    if not catalog:
        raise ValidationError({
            'error': 'Required argument: catalog'})

    if catalog not in CATALOGS:
        raise ValidationError({
            'error': 'Catalog must be one of: {}'
                     .format(', '.join(CATALOGS.keys()))})

    search_kwargs = {
        'query': request.query_params.get('query'),
        'to_date': parse_date(request.query_params.get('to_date')),
        'from_date': parse_date(request.query_params.get('from_date')),
        'bbox': request.query_params.get('bbox'),
        'page': page,
    }

    search = CATALOGS[catalog]['search']
    serializer = CATALOGS[catalog]['serializer']
    is_pageable = CATALOGS[catalog]['is_pageable']

    try:
        result = ResourceListSerializer(search(**search_kwargs),
                                        context={
                                            'page': page,
                                            'is_pageable': is_pageable,
                                            'request_uri': request_uri,
                                            'serializer': serializer})
        return [result.data]
    except ValueError as ex:
        raise ParseError(ex.message)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny,))
def search(request):
    return Response(_do_search(request))
