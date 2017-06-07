# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import dateutil.parser
from rest_framework import decorators
from rest_framework.exceptions import ValidationError, ParseError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.bigcz.clients import SEARCH_FUNCTIONS
from apps.bigcz.serializers import ResourceListSerializer


def parse_date(value):
    if not value:
        return None
    return dateutil.parser.parse(value)


def _do_search(request):
    catalog = request.query_params.get('catalog')

    if not catalog:
        raise ValidationError({
            'error': 'Required argument: catalog'})

    search_kwargs = {
        'query': request.query_params.get('query'),
        'to_date': parse_date(request.query_params.get('to_date')),
        'from_date': parse_date(request.query_params.get('from_date')),
        'bbox': request.query_params.get('bbox'),
    }

    search = SEARCH_FUNCTIONS.get(catalog)

    if search:
        try:
            return search(**search_kwargs)
        except ValueError as ex:
            raise ParseError(ex.message)

    raise ValidationError({
        'error': 'Catalog must be one of: {}'
                 .format(', '.join(SEARCH_FUNCTIONS.keys()))
    })


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny,))
def search(request):
    result = ResourceListSerializer(_do_search(request))
    return Response(result.data)
