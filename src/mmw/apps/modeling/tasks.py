# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

import os
import logging
import json
import requests

from StringIO import StringIO

from celery import shared_task

from apps.modeling.geoprocessing import histogram_start, histogram_finish, \
    data_to_survey, data_to_census, data_to_censuses

from apps.modeling.calcs import (animal_population,
                                 point_source_pollution,
                                 catchment_water_quality)

from apps.modeling.geoprocessing import to_one_ring_multipolygon

from tr55.model import simulate_day
from gwlfe import gwlfe, parser

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54
ACRES_PER_SQM = 0.000247105

DRB = 'drb'

RWD_HOST = os.environ.get('RWD_HOST', 'localhost')
RWD_PORT = os.environ.get('RWD_PORT', '5000')


@shared_task
def start_rwd_job(location, snapping, data_source):
    """
    Calls the Rapid Watershed Delineation endpoint
    that is running in the Docker container, and returns
    the response unless there is an out-of-watershed error
    which raises an exception.
    """
    location = json.loads(location)
    lat, lng = location
    end_point = 'rwd' if data_source == DRB else 'rwd-nhd'
    rwd_url = 'http://%s:%s/%s/%f/%f' % (RWD_HOST, RWD_PORT, end_point,
                                         lat, lng)

    # The Webserver defaults to enable snapping, uses 1 (true) 0 (false)
    if not snapping:
        rwd_url += '?snapping=0'

    logger.debug('rwd request: %s' % rwd_url)

    response_json = requests.get(rwd_url).json()
    if 'error' in response_json:
        raise Exception(response_json['error'])

    return response_json


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def start_histogram_job(self, json_polygon):
    """ Calls the histogram_start function to
    kick off the SJS job to generate a histogram
    of the provided polygon (i.e. AoI).
    Returns the id of the job so we can poll later
    for the results, as well as the pixel width of
    the polygon so that areas can be calculated from
    the results.
    """

    # Normalize AOI to handle single-ring multipolygon
    # inputs sent from RWD as well as shapes sent from the front-end
    polygon = parse_single_ring_multipolygon(json.loads(json_polygon))

    return {
        'pixel_width': aoi_resolution(polygon),
        'sjs_job_id': histogram_start([json.dumps(polygon)], self.retry)
    }


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def start_histograms_job(self, polygons):
    """ Calls the histogram_start function to
    kick off the SJS job to generate a histogram
    of the provided polygons (i.e. AoI + modifications,
    or just modifications).
    Returns the id of the job so we can poll later
    for the results. pixel_width is None because the
    results are eventually provided to TR-55 and areas
    do not need to be calculated.
    """
    json_polygons = [json.dumps(p) for p in polygons]

    return {
        'pixel_width': None,
        'sjs_job_id': histogram_start(json_polygons, self.retry)
    }


@shared_task(bind=True, default_retry_delay=1, max_retries=42)
def get_histogram_job_results(self, incoming):
    """ Calls a function that polls SJS for the results
    of the given Job. Self here is Celery.
    """
    pixel_width = incoming['pixel_width']
    histogram = histogram_finish(incoming['sjs_job_id'], self.retry)

    return {
        'pixel_width': pixel_width,
        'histogram': histogram
    }


@shared_task
def histogram_to_survey_census(incoming):
    """
    Converts the histogram results (aka analyze results)
    to a survey & census of land use, which are rendered in the UI.
    """
    pixel_width = incoming['pixel_width']
    data = incoming['histogram'][0]
    census = data_to_census(data)
    survey = data_to_survey(data)
    convert_result_areas(pixel_width, survey)

    return {'survey': survey, 'census': census}


@shared_task
def histograms_to_censuses(incoming):
    """
    Converts the histogram results to censuses,
    which are provided to TR-55.
    """
    data = incoming['histogram']
    results = data_to_censuses(data)

    return results


@shared_task
def analyze_animals(area_of_interest):
    """
    Given an area of interest, returns the animal population within it.
    """
    return {'survey': [animal_population(area_of_interest)]}


@shared_task
def analyze_pointsource(area_of_interest):
    """
    Given an area of interest, returns point sources of pollution within it.
    """
    return {'survey': [point_source_pollution(area_of_interest)]}


@shared_task
def analyze_catchment_water_quality(area_of_interest):
    """
    Given an area of interest in the DRB, returns catchment water quality data
    within it.
    """
    return {'survey': [catchment_water_quality(area_of_interest)]}


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


def format_quality(model_output):
    measures = ['Total Suspended Solids',
                'Total Nitrogen',
                'Total Phosphorus']
    codes = ['tss', 'tn', 'tp']

    quality = {}
    for key in model_output:
        def map_and_convert_units(input):
            measure, code = input
            return {
                'measure': measure,
                'load': model_output[key][code] * KG_PER_POUND,
                'runoff': model_output[key]['runoff']  # Already CM
            }

        quality[key] = map(map_and_convert_units, zip(measures, codes))

    return quality


def format_runoff(model_output):
    """
    Convert model output values that are in inches into centimeters.
    """
    inch_keys = ['runoff', 'inf', 'et']
    for key in model_output:
        for item in inch_keys:
            model_output[key][item] = model_output[key][item] * CM_PER_INCH

        distribution = model_output[key]['distribution']
        for k in distribution:
            for item in inch_keys:
                model_output[key]['distribution'][k][item] = \
                    model_output[key]['distribution'][k][item] * CM_PER_INCH

    return model_output


@shared_task
def run_tr55(censuses, model_input, cached_aoi_census=None):
    """
    A Celery wrapper around our TR55 implementation.
    censuses is either output from previous tasks in the job
    chain or are provided directly (in the case where the AoI
    census and modification censuses are cached).
    If cached_aoi_census is provided, censuses will only contain
    the modification_censuses, which were generated in the
    previous task. If cached_aoi_census isn't provided, the AoI
    census will be the first census in censuses, and everything
    else is a modification census.
    """

    # Get precipitation and cell resolution
    precip = get_precip(model_input)

    # Normalize AOI to handle single-ring multipolygon
    # inputs sent from RWD as well as shapes sent from the front-end
    aoi = to_one_ring_multipolygon(model_input.get('area_of_interest'))

    width = aoi_resolution(aoi)
    resolution = width * width

    if precip is None:
        raise Exception('No precipitation value defined')

    # Modification/BMP fragments and their censuses
    # The original modifications are not POSTed. We only
    # send the altered modifications/modification pieces.
    modification_pieces = model_input.get('modification_pieces')
    modification_censuses = (censuses[1:] if cached_aoi_census is None
                             else censuses[0:])

    # Calculate total areas for each type modification
    area_sums = {}
    for piece in modification_pieces:
        kinds = piece['value']
        area = piece['area']

        if 'bmp' in kinds:
            kind = kinds['bmp']
        else:
            kind = kinds['reclass']

        if kind in area_sums:
            area_sums[kind] += area
        else:
            area_sums[kind] = area

    area_bmps = {k: v for k, v in area_sums.iteritems()}

    # The area of interest census
    aoi_census = cached_aoi_census if cached_aoi_census else censuses[0]

    modifications = []
    if (modification_pieces and not modification_censuses):
        raise Exception('Missing censuses for modifications')
    elif (modification_censuses and not modification_pieces):
        modification_censuses = []

    modifications = build_tr55_modification_input(modification_pieces,
                                                  modification_censuses)
    aoi_census['modifications'] = modifications
    aoi_census['BMPs'] = area_bmps

    # Run the model under both current conditions and Pre-Columbian
    # conditions.
    try:
        model_output = simulate_day(aoi_census, precip,
                                    cell_res=resolution)

        precolumbian_output = simulate_day(aoi_census,
                                           precip,
                                           cell_res=resolution,
                                           precolumbian=True)

        model_output['pc_unmodified'] = precolumbian_output['unmodified']
        model_output['pc_modified'] = precolumbian_output['modified']
        runoff = format_runoff(model_output)
        quality = format_quality(model_output)

    except KeyError as e:
        model_output = None
        precolumbian_output = None
        runoff = {}
        quality = []
        logger.error('Bad input data to TR55: %s' % e)

    # Modifications were added to aoi_census for TR-55, but we do
    # not want to persist it since we have it stored seperately
    # and it may cause problems when sharing the aoi_census
    # for other model runs and scenarios.
    aoi_census.pop('modifications', None)

    # Return all results
    return {
        'inputmod_hash': model_input['inputmod_hash'],
        'modification_hash': model_input['modification_hash'],
        'aoi_census': aoi_census,
        'modification_censuses': modification_censuses,
        'runoff': runoff,
        'quality': quality
    }


def get_precip(model_input):
    try:
        precips = [item for item in model_input['inputs']
                   if item['name'] == 'precipitation']
        return precips[0]['value']
    except Exception:
        return None


def convert_result_areas(pixel_width, results):
    """
    Updates area values on the survey results. The survey gives area as a
    number of pixels in a geotiff. This converts the area to square meters.
    """
    for i in range(len(results)):
        categories = results[i]['categories']
        for j in range(len(categories)):
            categories[j]['area'] = (categories[j]['area'] * pixel_width *
                                     pixel_width)


def build_tr55_modification_input(pieces, censuses):
    """ Applying modifications to the AoI census.
    In other words, preparing part of the model input
    for TR-55 that contains the "this area was converted
    from developed to forest" directives, for example.
    """
    def change_key(modification):
        name = modification['name']
        value = modification['value']

        if name == 'landcover':
            return {'change': ':%s:' % value['reclass']}
        elif name == 'conservation_practice':
            return {'change': '::%s' % value['bmp']}
        elif name == 'both':
            return {'change': ':%s:%s' % (value['reclass'], value['bmp'])}

    changes = [change_key(piece) for piece in pieces]
    for (census, change) in zip(censuses, changes):
        census.update(change)

    return censuses


@shared_task
def run_gwlfe(model_input, inputmod_hash):
    """
    Given a model_input resulting from a MapShed run, converts that dictionary
    to an intermediate GMS file representation, which is then parsed by GWLF-E
    to create the final data model z. We run GWLF-E on this final data model
    and return the results.

    This intermediate GMS file representation needs to be created because most
    of GWLF-E logic is written to handle GMS files, and to support dictionaries
    directly we would have to replicate all that logic. Thus, it is easier to
    simply create a GMS file and have it read that.
    """
    output = to_gms_file(model_input)

    reader = parser.GmsReader(output)
    z = reader.read()

    result = gwlfe.run(z)
    result['inputmod_hash'] = inputmod_hash

    return result


def to_gms_file(mapshed_data):
    """
    Given a dictionary of MapShed data, uses GWLF-E to convert it to a GMS file
    """
    mapshed_areas = [round(a, 1) for a in mapshed_data['Area']]
    mapshed_data['Area'] = mapshed_areas

    pre_z = parser.DataModel(mapshed_data)
    output = StringIO()
    writer = parser.GmsWriter(output)
    writer.write(pre_z)

    output.seek(0)

    return output
