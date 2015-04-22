# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny
from django.shortcuts import get_object_or_404

from models import District


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def district(request, id=None, state=None):
    if id:  # query by unique id
        district = get_object_or_404(District, id=id)
        coordinates = []
        for polygon in district.polygon.coords:
            coordinates.append(polygon[0])
        dictionary = {'type': 'Feature',
                      'properties': {},
                      'geometry': {'type': 'Polygon',
                                   'coordinates': coordinates}}
        return Response(dictionary)
    else:  # provide list of all ids
        shapes = District.objects.order_by('state_fips', 'district_fips')
        shapes = [{'id': shape.id, 'name': shape.name()} for shape in shapes]
        dictionary = {'shapes': shapes}
        return Response(dictionary)
