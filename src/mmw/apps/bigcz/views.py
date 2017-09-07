# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib.gis.geos import GEOSGeometry
from rest_framework import decorators
from rest_framework.exceptions import ValidationError, ParseError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.bigcz.clients import CATALOGS
from apps.bigcz.models import BBox
from apps.bigcz.serializers import ResourceListSerializer
from apps.bigcz.utils import parse_date

import json


def _do_search(request):
    params = json.loads(request.body)
    catalog = params.get('catalog')
    page = int(params.get('page', 1))
    request_uri = request.build_absolute_uri()

    if not catalog:
        raise ValidationError({
            'error': 'Required argument: catalog'})

    if catalog not in CATALOGS:
        raise ValidationError({
            'error': 'Catalog must be one of: {}'
                     .format(', '.join(CATALOGS.keys()))})

    # Use a proper GEOS shape and calculate the bbox
    geom = GEOSGeometry(json.dumps(params.get('geom')))
    bounds = geom.boundary.coords[0]
    x_coords = {coord[0] for coord in bounds}
    y_coords = {coord[1] for coord in bounds}

    bbox = BBox(min(x_coords), min(y_coords), max(x_coords), max(y_coords))

    search_kwargs = {
        'query': params.get('query'),
        'to_date': parse_date(params.get('to_date')),
        'from_date': parse_date(params.get('from_date')),
        'geom': geom,
        'bbox': bbox,
        'options': params.get('options', ''),
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


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny,))
def search(request):
    return Response(_do_search(request))
