# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests
import dateutil.parser
from rest_framework.exceptions import ValidationError

from django.conf import settings
from django.contrib.gis.geos import Point, Polygon

from apps.bigcz.models import ResourceLink, ResourceList
from apps.bigcz.utils import RequestTimedOutError

from apps.bigcz.clients.hydroshare.models import HydroshareResource


CATALOG_NAME = 'hydroshare'
CATALOG_URL = 'https://www.hydroshare.org/hsapi/resource/'


def parse_date(value):
    return dateutil.parser.parse(value)


def parse_box(box):
    return Polygon((
        (float(box['westlimit']), float(box['northlimit'])),
        (float(box['eastlimit']), float(box['northlimit'])),
        (float(box['eastlimit']), float(box['southlimit'])),
        (float(box['westlimit']), float(box['southlimit'])),
        (float(box['westlimit']), float(box['northlimit'])),
    ))


def parse_point(point):
    return Point(float(point['east']), float(point['north']))


def parse_geom(coverages):
    geoms = []
    if coverages:
        geoms.extend([parse_box(c['value'])
                      for c in coverages
                      if c['type'] == 'box'])
        geoms.extend([parse_point(c['value'])
                      for c in coverages
                      if c['type'] == 'point'])
        if geoms:
            geom = geoms[0]
            for g in geoms[1:]:
                geom |= g

            return geom

    return None


def parse_coverage_period(coverages):
    if coverages:
        period = [c['value'] for c in coverages if c['type'] == 'period']
        if period and period[0]:
            return period[0]['start'], period[0]['end']

    return None, None


def parse_record(item):
    start, end = parse_coverage_period(item['coverages'])

    return HydroshareResource(
        id=item['resource_id'],
        title=item['resource_title'],
        description=None,
        author=item['creator'],
        links=[
            ResourceLink('details', item['resource_url'])
        ],
        created_at=parse_date(item['date_created']),
        updated_at=parse_date(item['date_last_updated']),
        geom=parse_geom(item['coverages']),
        begin_date=parse_date(start) if start else None,
        end_date=parse_date(end) if end else None)


def prepare_bbox(box):
    return {
        'west': box.xmin,
        'east': box.xmax,
        'north': box.ymin,
        'south': box.ymax,
    }


def prepare_date(value):
    return value.strftime('%Y-%m-%d')


def search(**kwargs):
    query = kwargs.get('query')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    bbox = kwargs.get('bbox')
    page = kwargs.get('page')

    if not query:
        raise ValidationError({
            'error': 'Required argument: query'})

    params = {
        'full_text_search': query,
    }

    if to_date:
        params.update({
            'to_date': prepare_date(to_date)
        })
    if from_date:
        params.update({
            'from_date': prepare_date(from_date)
        })
    if bbox:
        params.update(prepare_bbox(bbox))
        params.update({
            'coverage_type': 'box'
        })
    if page:
        params.update({
            'page': page
        })

    try:
        response = requests.get(CATALOG_URL,
                                timeout=settings.BIGCZ_CLIENT_TIMEOUT,
                                params=params)
    except requests.Timeout:
        raise RequestTimedOutError()

    data = response.json()

    if 'results' not in data:
        raise ValueError(data)

    results = data['results']
    count = data['count']

    return ResourceList(
        api_url=response.url,
        catalog=CATALOG_NAME,
        count=count,
        results=[parse_record(item) for item in results])
