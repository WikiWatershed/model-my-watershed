# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import math
import numpy as np


def day_lengths(geom):
    """
    Given a geometry in EPSG:4326, returns an array of 12 floats, each
    representing the average number of daylight hours at that geometry's
    centroid for each month.
    """
    latitude = geom.centroid[1]
    lengths = np.zeros(12)

    for month in range(12):
        # Magic formula taken from original MapShed source
        lengths[month] = 7.63942 * math.acos(0.43481 *
                                             math.tan(latitude * 0.017453) *
                                             math.cos(0.0172 *
                                                      (month * 30.4375 - 5)))

    return lengths
