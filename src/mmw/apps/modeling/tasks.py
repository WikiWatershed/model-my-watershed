# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from celery import shared_task
import json
import logging
import math

from apps.modeling.geoprocessing import histogram_start, histogram_finish, \
    data_to_survey, data_to_censuses

from tr55.model import simulate_day

logger = logging.getLogger(__name__)

KG_PER_POUND = 0.453592
CM_PER_INCH = 2.54


@shared_task
def start_histogram_job(json_polygon):
    """ Calls the histogram_start function to
    kick off the SJS job to generate a histogram
    of the provided polygon (i.e. AoI).
    Returns the id of the job so we can poll later
    for the results, as well as the pixel width of
    the polygon so that areas can be calculated from
    the results.
    """
    polygon = json.loads(json_polygon)

    return {
        'pixel_width': aoi_resolution(polygon),
        'sjs_job_id': histogram_start([json_polygon])
    }


@shared_task
def start_histograms_job(polygons):
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
        'sjs_job_id': histogram_start(json_polygons)
    }


@shared_task(bind=True, default_retry_delay=1, max_retries=20)
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
def histogram_to_survey(incoming):
    """
    Converts the histogram results (aka analyze results)
    to a survey of land use, which are rendered in the UI.
    """
    pixel_width = incoming['pixel_width']
    data = incoming['histogram'][0]
    results = data_to_survey(data)
    convert_result_areas(pixel_width, results)

    return results


@shared_task
def histograms_to_censuses(incoming):
    """Converts the histogram results to censuses,
    which are provided to TR-55.
    """
    data = incoming['histogram']
    results = data_to_censuses(data)

    return results


def aoi_resolution(area_of_interest):
    # Find the width in meters of a pixel at the average lat of the shape.
    pairs = area_of_interest['coordinates'][0][0]
    average_lat = reduce(lambda total, p: total+p[1], pairs, 0) / len(pairs)

    # Zoom level is a hard coded value in the geoprocessing library.
    # TMS zoom levels are relative to tiles, not pixels.  The dataset
    # that we are using on S3 has tiles of size 768x768 (instead of
    # the more typical 256x256) and is at zoom level 11.  This
    # corresponds roughly to zoom level 13 with 256x256 tiles.
    zoom = 11
    tile_width = 768
    # See https://msdn.microsoft.com/en-us/library/bb259689.aspx
    return (math.cos(average_lat * math.pi / 180) * 2 * math.pi *
            6378137) / (tile_width * math.pow(2, zoom))


def format_quality(model_output):
    measures = ['Biochemical Oxygen Demand',
                'Total Suspended Solids',
                'Total Nitrogen',
                'Total Phosphorus']
    codes = ['bod', 'tss', 'tn', 'tp']

    def fn(input):
        measure, code = input
        return {
            'measure': measure,
            'load': model_output['modified'][code] * KG_PER_POUND
        }

    return map(fn, zip(measures, codes))


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
    width = aoi_resolution(model_input.get('area_of_interest'))
    resolution = width * width

    if precip is None:
        raise Exception('No precipitation value defined')

    # Modification/BMP fragments and their censuses
    # The original modifications are not POSTed. We only
    # send the altered modifications/modification pieces.
    modification_pieces = model_input.get('modification_pieces')
    modification_censuses = (censuses[1:] if cached_aoi_census is None
                             else censuses[0:])

    # The area of interest census
    aoi_census = cached_aoi_census if cached_aoi_census else censuses[0]

    modifications = []
    if ((modification_pieces and not modification_censuses) or
       (modification_censuses and not modification_pieces)):
            raise Exception('Missing pieces or censuses for modifications')

    modifications = build_tr55_modification_input(modification_pieces,
                                                  modification_censuses)
    aoi_census['modifications'] = modifications

    # Run the model under both current conditions and Pre-Columbian
    # conditions.
    model_output = simulate_day(aoi_census, precip, cell_res=resolution)
    precolumbian_output = simulate_day(aoi_census, precip,
                                       cell_res=resolution, precolumbian=True)

    model_output['pc_unmodified'] = precolumbian_output['unmodified']
    model_output['pc_modified'] = precolumbian_output['modified']

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
        'runoff': format_runoff(model_output),
        'quality': format_quality(model_output)
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
            return {'change': ':%s:' % value}
        elif name == 'conservation_practice':
            return {'change': '::%s' % value}
        elif name == 'both':
            return {'change': ':%s:%s' % (value['reclass'], value['bmp'])}

    changes = [change_key(piece) for piece in pieces]
    for (census, change) in zip(censuses, changes):
        census.update(change)

    return censuses
