# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import logging
import urllib2

# TODO Remove this when stub task is deleted.
import time

logger = logging.getLogger(__name__)


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


@shared_task
def make_gt_service_call_task(model_input):
    """
    Call geotrellis and calculate the tile data for use in the TR55 model.
    """
    # TODO call the real service
    # It would be nicer to use HttpDispatchTask but there were import problems.
    # In testing we could not make it work so we will probably need to default
    # to urllib2.
    # return HttpDispatchTask(url="http://gtservice.internal/endpoint",
    #                         method="POST", input=model_input)

    # TODO remove me. For testing fetch something over the web.
    result = urllib2.urlopen('http://azavea.com')
    return result.read()


@shared_task
def run_tr55(model_input, landscape):
    """
    A thin Celery wrapper around our TR55 implementation.
    """
    time.sleep(5)

    # TODO Get the real simpulation data.
    # (q, et, inf) = simulate_year(landscape)

    # TODO Dummy data. Remove me.
    q = 2
    et = 3
    inf = 4
    return {
        'q': q,
        'et': et,
        'inf': inf,
    }
