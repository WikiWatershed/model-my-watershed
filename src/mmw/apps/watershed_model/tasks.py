# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task

import logging
import urllib2

from tr55.model import simulate_year

# TODO REMOVE THIS.
import time

logger = logging.getLogger(__name__)


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
    print(landscape)
    # TODO Remove this.
    # hard coded values for test
    landscape = {
        'result': {
            'cell_count': 147,
            'distribution': {
                'd:hi_residential': 33,
                'c:commercial': 42,
                'a:deciduous_forest': 72
            }
        }
    }
    time.sleep(5)

    (q, et, inf) = simulate_year(landscape)
    return {
        'q': q,
        'et': et,
        'inf': inf,
    }
