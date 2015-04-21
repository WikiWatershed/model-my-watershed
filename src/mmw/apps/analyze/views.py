# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework.response import Response
from rest_framework import decorators
from rest_framework.permissions import AllowAny


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def analyze(request, format=None):
    results = [
        {
            "name": "land",
            "displayName": "Land",
            "categories": [
                {
                    "type": "Water",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Developed: Open",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Developed: Low",
                    "area": 5181,
                    "coverage": .271
                },
                {
                    "type": "Developed: Medium",
                    "area": 3344,
                    "coverage": .175
                },
                {
                    "type": "Developed: High",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Bare Soil",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Forest",
                    "area": 1804,
                    "coverage": 9.4
                }
            ]
        },
        {
            "name": "soil",
            "displayName": "Soil",
            "categories": [
                {
                    "type": "Clay",
                    "area": 21,
                    "coverage": 0.01
                },
                {
                    "type": "Silt",
                    "area": 5041,
                    "coverage": .263
                },
                {
                    "type": "Sand",
                    "area": 21,
                    "coverage": .271
                },
            ]
        }
    ]

    return Response(results)
