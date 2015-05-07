# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task

# TODO Remove this when stub task is deleted.
import time


@shared_task
def run_analyze(area_of_interest):
    time.sleep(3)

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
                    "coverage": .094
                },
                {
                    "type": "Deciduous Forest",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Evergreen Forest",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Mixed Forest",
                    "area": 1804,
                    "coverage": .094
                },
                {
                    "type": "Dwarf Scrub",
                    "area": 1103,
                    "coverage": .058
                },
                {
                    "type": "Moss",
                    "area": 19,
                    "coverage": .001
                },
                {
                    "type": "Pasture",
                    "area": 1804,
                    "coverage": .094
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

    return results
