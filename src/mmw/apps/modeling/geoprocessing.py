# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.conf import settings
from celery.exceptions import MaxRetriesExceededError

import requests
import json
import re


# Here, the keys of this dictionary are NLCD numbers (found in the
# rasters), and the values of the dictionary are arrays of length two.
# The first element of each array is the name of the NLCD category in
# the TR-55 code.  The second string is a short, human-readable name.
NLCD_MAPPING = {
    11: ['open_water', 'Open Water'],
    12: ['perennial_ice', 'Perennial Ice/Snow'],
    21: ['developed_open', 'Developed, Open Space'],
    22: ['developed_low', 'Developed, Low Intensity'],
    23: ['developed_med', 'Developed, Medium Intensity'],
    24: ['developed_high', 'Developed, High Intensity'],
    31: ['barren_land', 'Barren Land (Rock/Sand/Clay)'],
    41: ['deciduous_forest', 'Deciduous Forest'],
    42: ['evergreen_forest', 'Evergreen Forest'],
    43: ['mixed_forest', 'Mixed Forest'],
    52: ['shrub', 'Shrub/Scrub'],
    71: ['grassland', 'Grassland/Herbaceous'],
    81: ['pasture', 'Pasture/Hay'],
    82: ['cultivated_crops', 'Cultivated Crops'],
    90: ['woody_wetlands', 'Woody Wetlands'],
    95: ['herbaceous_wetlands', 'Emergent Herbaceous Wetlands']
}

# The soil rasters contain the numbers 1 through 4 (the keys of this
# dictionary).  The values of this dictionary are length-two arrays
# containing two strings.  The first member of each array is the name
# used for the corresponding soil-type in the TR-55 code.  The second
# member of each array is a human-readable description of that
# soil-type.
SOIL_MAPPING = {
    1: ['a', 'Sand'],
    2: ['b', 'Loam'],
    3: ['c', 'Sandy Clay'],
    4: ['d', 'Clay Loam']
}


def histogram_start(polygons):
    """
    Together, histogram_start and histogram_finish implement a
    function which takes a list of polygons or multipolygons as input,
    and returns histograms of the NLCD x soil pairs that occur in each
    shape.

    This is the top-half of the function.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']
    path = settings.GEOP['path']
    request = settings.GEOP['request'].copy()
    request['input']['geometry'] = polygons
    url = "http://%s:%s%s" % (host, port, path)

    post = requests.post(url, data=json.dumps(request))
    if post.ok:
        data = post.json()
    else:
        raise Exception('Unable to communicate with SJS (top-half).')

    if data['status'] == 'STARTED':
        return data['result']['jobId']
    else:
        raise Exception('Job submission failed.')


def histogram_finish(job_id, retry):
    """
    This is the bottom-half of the function.
    """
    def dict_to_array(d):
        result = []
        for k, v in d.iteritems():
            [k1, k2] = map(int, re.sub('[^0-9,]', '', k).split(','))
            result.append(((k1, k2), v))
        return result

    host = settings.GEOP['host']
    port = settings.GEOP['port']
    url = "http://%s:%s/jobs/%s" % (host, port, job_id)

    get = requests.get(url)
    if get.ok:
        data = get.json()
    else:
        raise Exception('Unable to communicate with SJS (bottom-half).')

    if data['status'] == 'OK':
        if requests.delete(url).ok:  # job complete, remove
            return [dict_to_array(d) for d in data['result']]
        else:
            raise Exception('Job completed, unable to delete.')
    elif data['status'] == 'RUNNING':
        try:
            retry()
        except MaxRetriesExceededError, X:  # job took too long, terminate
            if requests.delete(url).ok:
                raise X
            else:
                raise Exception('Job timed out, unable to delete.')
    else:
        if requests.delete(url).ok:  # job failed, terminate
            raise Exception('Job failed, deleted.')
        else:
            raise Exception('Job failed, unable to delete.')


def histogram_to_x(data, nucleus, update_rule, after_rule):
    """
    Transform a raw Geotrellis histogram into an object of the desired
    form (dictated by the last three arguments).
    """
    retval = nucleus
    total = 0

    for ((nlcd, soil), count) in data:
        total += count
        update_rule(nlcd, soil, count, retval)

    after_rule(total, retval)

    return retval


def data_to_censuses(data):
    return [data_to_census(subdata) for subdata in data]


def data_to_census(data):
    """
    Turn raw data from Geotrellis into a census.
    """
    def update_rule(nlcd, soil, count, census):
        dist = census['distribution']
        if nlcd in NLCD_MAPPING and soil in SOIL_MAPPING:
            nlcd_str = NLCD_MAPPING[nlcd][0]
            soil_str = SOIL_MAPPING[soil][0]
            key_str = '%s:%s' % (soil_str, nlcd_str)
            dist[key_str] = {'cell_count': count}

    def after_rule(count, census):
        census['cell_count'] = count

    nucleus = {'distribution': {}}

    return histogram_to_x(data, nucleus, update_rule, after_rule)


def data_to_survey(data):
    """
    Turn raw data from Geotrellis into a survey.
    """
    def update_category(string, count, categories):
        if string in categories:
            entry = categories[string]
            entry['area'] += count
        else:
            categories[string] = {
                'type': string,
                'area': count,
                'coverage': None
            }

    def update_pcts(entry, count):
        area = entry['area']
        entry['coverage'] = float(area) / count
        return entry

    def update_rule(nlcd, soil, count, survey):
        landCategories = survey[0]['categories']
        soilCategories = survey[1]['categories']

        if nlcd in NLCD_MAPPING:
            update_category(NLCD_MAPPING[nlcd][1], count, landCategories)
        else:
            update_category('?', count, landCategories)

        if soil in SOIL_MAPPING:
            update_category(SOIL_MAPPING[soil][1], count, soilCategories)
        else:
            update_category('?', count, soilCategories)

    def after_rule(count, survey):
        nlcd_names = [v[1] for v in NLCD_MAPPING.values()]
        nlcd_keys = NLCD_MAPPING.keys()
        used_nlcd_names = [k for k in survey[0]['categories'].keys()]

        for index, name in enumerate(nlcd_names):
            nlcd = nlcd_keys[index]

            if (name not in used_nlcd_names):
                survey[0]['categories'][name] = {
                    'type': name,
                    'coverage': None,
                    'area': 0,
                    'nlcd': nlcd
                }
            else:
                survey[0]['categories'][name]['nlcd'] = nlcd

        land = survey[0]['categories'].iteritems()
        soil = survey[1]['categories'].iteritems()

        survey[0]['categories'] = [update_pcts(v, count) for k, v in land]
        survey[1]['categories'] = [update_pcts(v, count) for k, v in soil]

    nucleus = [
        {
            'name': 'land',
            'displayName': 'Land',
            'categories': {}
        },
        {
            'name': 'soil',
            'displayName': 'Soil',
            'categories': {}
        }
    ]

    return histogram_to_x(data, nucleus, update_rule, after_rule)
