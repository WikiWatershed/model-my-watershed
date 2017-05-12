# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from math import sqrt


def aoi_resolution(area_of_interest):
    pairs = area_of_interest['coordinates'][0][0]

    average_lat = reduce(lambda total, p: total+p[1], pairs, 0) / len(pairs)

    max_lat = 48.7
    max_lat_count = 1116  # Number of pixels found in sq km at max lat
    min_lat = 25.2
    min_lat_count = 1112  # Number of pixels found in sq km at min lat

    # Because the tile CRS is Conus Albers @ 30m, the number of pixels per
    # square kilometer is roughly (but no exactly) 1100 everywhere
    # in the CONUS.  Iterpolate the number of cells at the current lat along
    # the range defined above.
    x = (average_lat - min_lat) / (max_lat - min_lat)
    x = min(max(x, 0.0), 1.0)
    pixels_per_sq_kilometer = ((1 - x) * min_lat_count) + (x * max_lat_count)
    pixels_per_sq_meter = pixels_per_sq_kilometer / 1000000

    return 1.0/sqrt(pixels_per_sq_meter)


def precipitation(model_input):
    try:
        precips = [item for item in model_input['inputs']
                   if item['name'] == 'precipitation']
        return precips[0]['value']
    except Exception:
        return None


def apply_modifications_to_census(pieces, censuses):
    """ Applying modifications to the AoI census.
    In other words, preparing part of the model input
    for TR-55 that contains the "this area was converted
    from developed to forest" directives, for example.
    """
    changes = [_change_key(piece) for piece in pieces]
    for (census, change) in zip(censuses, changes):
        census.update(change)

    return censuses


def _change_key(modification):
    name = modification['name']
    value = modification['value']

    key = '::'

    if name == 'landcover':
        key = ':{reclass}:'.format(reclass=value['reclass'])
    elif name == 'conservation_practice':
        key = '::{bmp}'.format(bmp=value['bmp'])
    elif name == 'both':
        key = ':{reclass}:{bmp}'.format(reclass=value['reclass'],
                                        bmp=value['bmp'])

    return {
        'change': key
    }
