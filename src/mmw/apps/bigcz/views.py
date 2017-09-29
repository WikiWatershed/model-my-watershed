# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.contrib.gis.geos import GEOSGeometry
from django.conf import settings
from rest_framework import decorators
from rest_framework.exceptions import ValidationError, ParseError, NotFound
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.bigcz.clients import CATALOGS
from apps.bigcz.serializers import ResourceListSerializer
from apps.bigcz.utils import (parse_date, get_bounds,
                              filter_aoi_intersection)


def filter_results(results, aoi, is_pageable):
    # Post process the raw search results to further filter out
    # geometries which aren't in the AoI
    filtered_results = filter_aoi_intersection(aoi, results.results)

    # If this isn't a paged query, we know how many results
    # have been filtered via post processing.  If it's paged,
    # the number is likely lower than reported, but we can't know
    # it unless we fetch all pages and filter.  However, if it's paged
    # and the count is less than the page size, we do know the total count
    cnt = results.count
    if not is_pageable or (is_pageable and
                           results.count <= settings.BIGCZ_CLIENT_PAGE_SIZE):
        cnt = len(filtered_results)

    return filtered_results, cnt


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
    aoi = GEOSGeometry(json.dumps(params.get('geom')))
    bbox = get_bounds(aoi)

    search_kwargs = {
        'query': params.get('query'),
        'to_date': parse_date(params.get('to_date')),
        'from_date': parse_date(params.get('from_date')),
        'bbox': bbox,
        'options': params.get('options', ''),
        'page': page,
    }

    search = CATALOGS[catalog]['search']
    serializer = CATALOGS[catalog]['serializer']
    is_pageable = CATALOGS[catalog]['is_pageable']

    try:
        results = search(**search_kwargs)

        filtered_results, cnt = filter_results(results, aoi, is_pageable)
        results.results = filtered_results
        results.count = cnt

        result = ResourceListSerializer(results,
                                        context={
                                            'page': page,
                                            'is_pageable': is_pageable,
                                            'request_uri': request_uri,
                                            'serializer': serializer})

        return [result.data]
    except ValueError as ex:
        raise ParseError(ex.message)


def _get_details(request):
    params = request.query_params
    catalog = params.get('catalog')

    if not catalog:
        raise ValidationError({
            'error': 'Required argument: catalog'})

    if catalog not in CATALOGS:
        raise ValidationError({
            'error': 'Catalog must be one of: {}'
                     .format(', '.join(CATALOGS.keys()))})

    details = CATALOGS[catalog]['details']

    if not details:
        raise NotFound({
            'error': 'No details endpoint for {}'
                     .format(catalog)})

    details_kwargs = {
        'wsdl': params.get('wsdl'),
        'site': params.get('site'),
    }

    try:
        return details(**details_kwargs)
    except ValueError as ex:
        raise ParseError(ex.message)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny,))
def search(request):
    return Response(_do_search(request))


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny,))
def details(request):
    return Response(_get_details(request))
