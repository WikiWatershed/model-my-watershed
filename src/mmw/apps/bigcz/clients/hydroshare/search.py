# -*- coding: utf-8 -*-
from requests import Request, Session, Timeout
import dateutil.parser
from datetime import datetime
from rest_framework.exceptions import ValidationError

from django.core.cache import cache
from django.conf import settings
from django.contrib.gis.geos import Point, Polygon
from django.utils.timezone import make_aware

from apps.bigcz.models import ResourceLink, ResourceList
from apps.bigcz.utils import RequestTimedOutError

from apps.bigcz.clients.hydroshare.models import HydroshareResource


CATALOG_NAME = 'hydroshare'
CATALOG_URL = 'https://www.hydroshare.org/hsapi/resource/'

DATE_MIN = make_aware(datetime(1776, 7, 4, 0, 0))


def parse_date(value):
    d = dateutil.parser.parse(value)
    if d.tzinfo is None or d.tzinfo.utcoffset(d) is None:
        return make_aware(d)
    else:
        return d


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


def nullable_attrgetter(key, default):
    """To allow sorting on nullable field with default value"""
    def getter(item):
        return getattr(item, key) or default

    return getter


def search(**kwargs):
    query = kwargs.get('query')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    bbox = kwargs.get('bbox')
    page = kwargs.get('page')
    exclude_private = 'exclude_private' in kwargs.get('options')

    if not query:
        raise ValidationError({
            'error': 'Required argument: query'})

    params = {
        'full_text_search': query,
    }

    if bbox:
        params.update(prepare_bbox(bbox))
        params.update({
            'coverage_type': 'box'
        })
    if page:
        params.update({
            'page': page
        })

    session = Session()
    request = session.prepare_request(Request('GET',
                                              CATALOG_URL,
                                              params=params))

    key = f'bigcz_hydroshare_{hash(frozenset(params.items()))}'
    cached = cache.get(key)
    if cached:
        data = cached

    else:
        try:
            response = session.send(request,
                                    timeout=settings.BIGCZ_CLIENT_TIMEOUT)
            data = response.json()
            cache.set(key, data, timeout=1800)  # Cache for half hour
        except Timeout:
            raise RequestTimedOutError()

    if 'results' not in data:
        raise ValueError(data)

    items = data['results']
    if exclude_private:
        items = [item for item in items if item['public']]

    records = [parse_record(item) for item in items]
    # Include only those with geometries
    records = [r for r in records if r.geom]

    if from_date:
        records = [r for r in records
                   if r.end_date and r.end_date >= make_aware(from_date)]

    if to_date:
        records = [r for r in records
                   if r.begin_date and r.begin_date <= make_aware(to_date)]

    results = sorted(records,
                     key=nullable_attrgetter('end_date', DATE_MIN),
                     reverse=True)
    count = data['count']

    return ResourceList(
        api_url=request.url,
        catalog=CATALOG_NAME,
        count=count,
        results=results)
