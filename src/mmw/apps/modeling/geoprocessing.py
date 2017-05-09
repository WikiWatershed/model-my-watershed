# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from ast import literal_eval as make_tuple

from django.conf import settings
from django_statsd.clients import statsd
from celery.exceptions import MaxRetriesExceededError
from requests.exceptions import ConnectionError

import requests
import json


@statsd.timer(__name__ + '.sjs_submit')
def sjs_submit(data, retry=None):
    """
    Submits a job to Spark Job Server. Returns its Job ID, which
    can be used with sjs_retrieve to get the final result.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']
    args = settings.GEOP['args']

    base_url = 'http://{}:{}'.format(host, port)
    jobs_url = '{}/jobs?{}'.format(base_url, args)

    try:
        response = requests.post(jobs_url, data=json.dumps(data))
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        job = response.json()
    else:
        error = response.json()

        if error['status'] == 'NO SLOTS AVAILABLE' and retry is not None:
            retry(exc=Exception('No slots available in Spark JobServer.\n'
                                'Details = {}'.format(response.text)))
        elif error['result'] == 'context geoprocessing not found':
            reboot_sjs_url = '{}/contexts?reset=reboot'.format(base_url)
            context_response = requests.put(reboot_sjs_url)

            if context_response.ok:
                if retry is not None:
                    retry(exc=Exception('Geoprocessing context missing in '
                                        'Spark JobServer\nDetails = {}'.format(
                                            context_response.text)))
                else:
                    raise Exception('Geoprocessing context missing in '
                                    'Spark JobServer, but no retry was set.\n'
                                    'Details = {}'.format(
                                        context_response.text))

            else:
                raise Exception('Unable to create missing geoprocessing '
                                'context in Spark JobServer.\n'
                                'Details = {}'.format(context_response.text))
        else:
            raise Exception('Unable to submit job to Spark JobServer.\n'
                            'Details = {}'.format(response.text))

    if job['status'] == 'STARTED':
        return job['result']['jobId']
    else:
        raise Exception('Submitted job did not start in Spark JobServer.\n'
                        'Details = {}'.format(response.text))


@statsd.timer(__name__ + '.sjs_retrieve')
def sjs_retrieve(job_id, retry=None):
    """
    Given a job ID, will try to retrieve its value. If the job is
    still running, will call the optional retry function before
    proceeding.
    """
    host = settings.GEOP['host']
    port = settings.GEOP['port']

    url = 'http://{}:{}/jobs/{}'.format(host, port, job_id)
    try:
        response = requests.get(url)
    except ConnectionError as exc:
        if retry is not None:
            retry(exc=exc)

    if response.ok:
        job = response.json()
    else:
        raise Exception('Unable to retrieve job {} from Spark JobServer.\n'
                        'Details = {}'.format(job_id, response.text))

    if job['status'] == 'FINISHED':
        return job['result']
    elif job['status'] == 'RUNNING':
        if retry is not None:
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
        if job['status'] == 'ERROR':
            status = 'ERROR ({}: {})'.format(job['result']['errorClass'],
                                             job['result']['message'])
        else:
            status = job['status']

        delete = requests.delete(url)  # Job in unusual state, terminate
        if delete.ok:
            raise Exception('Job {} was {}, deleted'.format(job_id, status))
        else:
            raise Exception('Job {} was {}, could not delete.\n'
                            'Details = {}'.format(job_id, status, delete.text))


@statsd.timer(__name__ + '.histogram_start')
def histogram_start(polygons, retry=None):
    """
    Together, histogram_start and histogram_finish implement a
    function which takes a list of polygons or multipolygons as input,
    and returns histograms of the NLCD x soil pairs that occur in each
    shape.

    This is the top-half of the function.
    """
    data = settings.GEOP['json']['nlcd_soil_census'].copy()
    data['input']['polygon'] = polygons

    return sjs_submit(data, retry)


@statsd.timer(__name__ + '.histogram_finish')
def histogram_finish(job_id, retry):
    """
    This is the bottom-half of the function.
    """
    sjs_result = sjs_retrieve(job_id, retry)

    # Convert string "List(3,4)" to tuples (3,4) and
    # Map NODATA soil cells cells to 3
    # This was previously done within the SummaryJob: https://github.com/WikiWatershed/mmw-geoprocessing/blob/0d95dee35e729d9fd2f58fb9e73a69dcbe61df61/summary/src/main/scala/SummaryJob.scala#L106  # NOQA
    # but since MapshedJob doesn't support remapping, we do it here.
    nlcd_soil_count = {}
    for key, count in sjs_result.iteritems():
        (n, s) = make_tuple(key[4:])  # Convert "List(3,4)" to (3, 4)
        s2 = s if s != settings.NODATA else 3  # Map NODATA soil cells to 3
        nlcd_soil_count[(n, s2)] = count + nlcd_soil_count.get((n, s2), 0)

    # Convert to array for backwards compatibility
    result = [(ns, count) for ns, count in nlcd_soil_count.items()]

    return [result]


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
        if nlcd in settings.NLCD_MAPPING and soil in settings.SOIL_MAPPING:
            nlcd_str = settings.NLCD_MAPPING[nlcd][0]
            soil_str = settings.SOIL_MAPPING[soil][0]
            if soil_str == 'ad':
                soil_str = 'c'
            elif soil_str == 'bd':
                soil_str = 'c'
            elif soil_str == 'cd':
                soil_str = 'd'
            key_str = '%s:%s' % (soil_str, nlcd_str)
            dist[key_str] = {'cell_count': (
                count + (dist[key_str]['cell_count'] if key_str in dist else 0)
            )}

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

        if nlcd in settings.NLCD_MAPPING:
            update_category(settings.NLCD_MAPPING[nlcd], count, landCategories)
        else:
            update_category([nlcd, nlcd], count, landCategories)

        if soil in settings.SOIL_MAPPING:
            update_category(settings.SOIL_MAPPING[soil], count, soilCategories)
        else:
            update_category([soil, soil], count, soilCategories)

    def after_rule(count, survey):
        nlcd_names = [v[1] for v in settings.NLCD_MAPPING.values()]
        nlcd_keys = settings.NLCD_MAPPING.keys()
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
