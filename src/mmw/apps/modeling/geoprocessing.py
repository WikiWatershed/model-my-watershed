# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.conf import settings
from django_statsd.clients import statsd
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

# The soil rasters contain the numbers 1 through 7 (the keys of this
# dictionary).  The values of this dictionary are length-two arrays
# containing two strings.  The first member of each array is the name
# used for the corresponding soil-type in the TR-55 code.  The second
# member of each array is a human-readable description of that
# soil-type.
SOIL_MAPPING = {
    1: ['a', 'A - High Infiltration'],
    2: ['b', 'B - Moderate Infiltration'],
    3: ['c', 'C - Slow Infiltration'],
    4: ['d', 'D - Very Slow Infiltration'],
    5: ['ad', 'A/D - High/Very Slow Infiltration'],
    6: ['bd', 'B/D - Medium/Very Slow Infiltration'],
    7: ['cd', 'C/D - Medium/Very Slow Infiltration']
}


@statsd.timer(__name__ + '.sjs_submit')
def sjs_submit(host, port, args, data):
    """
    Submits a job to Spark Job Server. Returns its Job ID, which
    can be used with sjs_retrieve to get the final result.
    """
    url = 'http://{}:{}/jobs?{}'.format(host, port, args)
    response = requests.post(url, data=json.dumps(data))

    if response.ok:
        job = response.json()
    else:
        raise Exception('Unable to submit job to Spark JobServer.\n'
                        'Details = {}'.format(response.text))

    if job['status'] == 'STARTED':
        return job['result']['jobId']
    else:
        raise Exception('Submitted job did not start in Spark JobServer.\n'
                        'Details = {}'.format(response.text))


@statsd.timer(__name__ + '.sjs_retrieve')
def sjs_retrieve(host, port, job_id, retry=None):
    """
    Given a job ID, will try to retrieve its value. If the job is
    still running, will call the optional retry function before
    proceeding.
    """
    url = 'http://{}:{}/jobs/{}'.format(host, port, job_id)
    response = requests.get(url)

    if response.ok:
        job = response.json()
    else:
        raise Exception('Unable to retrieve job {} from Spark JobServer.\n'
                        'Details = {}'.format(job_id, response.text))

    if job['status'] == 'FINISHED':
        return job['result']
    elif job['status'] == 'RUNNING':
        if retry:
            try:
                retry()
            except MaxRetriesExceededError:
                delete = requests.delete(url)  # Job took too long, terminate
                if delete.ok:
                    raise Exception('Job {} timed out, '
                                    'deleted.'.format(job_id))
                else:
                    raise Exception('Job {} timed out, unable to delete.\n'
                                    'Details: {}'.format(job_id, delete.text))
    else:
        delete = requests.delete(url)  # Job in unusual state, terminate
        if delete.ok:
            raise Exception('Job {} was {}, deleted'.format(job_id,
                                                            job['status']))
        else:
            raise Exception('Job {} was {}, could not delete.\n'
                            'Details = {}'.format(job_id,
                                                  job['status'],
                                                  delete.text))


@statsd.timer(__name__ + '.histogram_start')
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
    args = settings.GEOP['args']['SummaryJob']
    data = settings.GEOP['json']['nlcdSoilCensus'].copy()
    data['input']['geometry'] = polygons

    return sjs_submit(host, port, args, data)


@statsd.timer(__name__ + '.histogram_finish')
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

    data = sjs_retrieve(host, port, job_id, retry)

    return [dict_to_array(d) for d in data]


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


@statsd.timer(__name__ + '.data_to_censuses')
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
            if soil_str == 'ad':
                soil_str = 'c'
            elif soil_str == 'bd':
                soil_str = 'c'
            elif soil_str == 'cd':
                soil_str = 'd'
            key_str = '%s:%s' % (soil_str, nlcd_str)
            dist[key_str] = {'cell_count': count}

    def after_rule(count, census):
        census['cell_count'] = count

    nucleus = {'distribution': {}}

    return histogram_to_x(data, nucleus, update_rule, after_rule)


@statsd.timer(__name__ + '.data_to_survey')
def data_to_survey(data):
    """
    Turn raw data from Geotrellis into a survey.
    """
    def update_category(codeAndValue, count, categories):
        code = codeAndValue[0]
        value = codeAndValue[1]

        if value in categories:
            entry = categories[value]
            entry['area'] += count
        else:
            categories[value] = {
                'code': code,
                'type': value,
                'area': count,
                'coverage': None
            }

    def update_pcts(entry, count):
        area = entry['area']
        entry['coverage'] = 0 if count == 0 else float(area) / count
        return entry

    def update_rule(nlcd, soil, count, survey):
        landCategories = survey[0]['categories']
        soilCategories = survey[1]['categories']

        if nlcd in NLCD_MAPPING:
            update_category(NLCD_MAPPING[nlcd], count, landCategories)
        else:
            update_category([nlcd, nlcd], count, landCategories)

        if soil in SOIL_MAPPING:
            update_category(SOIL_MAPPING[soil], count, soilCategories)
        else:
            update_category([soil, soil], count, soilCategories)

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
