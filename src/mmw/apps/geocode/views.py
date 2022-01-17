# -*- coding: utf-8 -*-
from django.conf import settings

from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny

from omgeo import Geocoder
from omgeo.places import PlaceQuery

geocoder = Geocoder(sources=settings.OMGEO_SETTINGS)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def geocode(request, format=None):
    query = request.GET.get('search', None)
    key = request.GET.get('key', None)
    if (not query):
        response = Response(data={'error': 'Search parameter is required.'},
                            status=400)
        return response
    pq = PlaceQuery(query=query, country='US', key=key)
    result = geocoder.geocode(pq)
    candidates = result['candidates']
    candidates = [_omgeo_candidate_to_dict(c) for c in candidates]
    return Response(candidates)


def _omgeo_candidate_to_dict(candidate):
    return {
        'address': candidate.match_addr,
        'region':  candidate.match_region,
        'city':    candidate.match_city,
        'score':   candidate.score,
        'x':       candidate.x,
        'y':       candidate.y,
        'type':    candidate.locator_type,
    }
