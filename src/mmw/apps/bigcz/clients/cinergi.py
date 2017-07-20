# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests
import dateutil.parser
from django.contrib.gis.geos import Polygon

from django.conf import settings

from apps.bigcz.models import Resource, ResourceLink, ResourceList, BBox
from apps.bigcz.utils import RequestTimedOutError


CATALOG_NAME = 'cinergi'
GEOPORTAL_URL = 'http://132.249.238.169:8080/geoportal/opensearch'


def parse_date(value):
    return dateutil.parser.parse(value) if value else None


def parse_envelope(envelope):
    if 'coordinates' not in envelope:
        raise ValueError('Expected envelope to contain coordinates')

    coords = envelope['coordinates']

    northwest = coords[0]
    southeast = coords[1]

    xmin, ymin = northwest
    xmax, ymax = southeast

    return Polygon.from_bbox((xmin, ymin, xmax, ymax))


def parse_geom(source):
    """
    Return Polygon or MultiPolygon from source by combining all
    available envelope_geo objects.

    - envelope_geo may be absent, an object, or list of objects
    """
    envelope = source.get('envelope_geo')

    if not envelope:
        return None

    if isinstance(envelope, dict):
        envelope = [envelope]

    geom = parse_envelope(envelope[0])

    for item in envelope[1:]:
        geom |= parse_envelope(item)

    return geom


def parse_links(source):
    """
    Parse "links" from item source.

    - links_s may be absent, a string, or list of strings
    """
    result = []
    links = source.get('links_s', [])

    if isinstance(links, basestring):
        links = [links]

    for url in links:
        result.append(ResourceLink('details', url))

    return result


def parse_record(item):
    source = item['_source']
    geom = parse_geom(source)
    links = parse_links(source)
    return Resource(
        id=item['_id'],
        title=source['title'],
        description=source.get('description'),
        author=None,
        links=links,
        created_at=parse_date(source.get('sys_created_dt')),
        updated_at=parse_date(source.get('src_lastupdate_dt')),
        geom=geom)


def prepare_bbox(value):
    box = BBox(value)
    return '{},{},{},{}'.format(box.xmin, box.ymin, box.xmax, box.ymax)


def prepare_date(value):
    return value.strftime('%Y-%m-%d')


def prepare_time(from_date, to_date):
    value = prepare_date(from_date)
    if to_date:
        value = '{}/{}'.format(value, prepare_date(to_date))
    return value


def search(**kwargs):
    query = kwargs.get('query')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    bbox = kwargs.get('bbox')

    params = {
        'f': 'json'
    }

    if query:
        params.update({
            'q': query
        })
    if from_date:
        params.update({
            'time': prepare_time(from_date, to_date)
        })
    if bbox:
        params.update({
            'bbox': prepare_bbox(bbox)
        })

    try:
        response = requests.get(GEOPORTAL_URL,
                                timeout=settings.BIGCZ_CLIENT_TIMEOUT,
                                params=params)
    except requests.Timeout:
        raise RequestTimedOutError()

    data = response.json()

    if 'hits' not in data:
        raise ValueError(data)

    results = data['hits']['hits']
    count = data['hits']['total']

    return ResourceList(
        api_url=response.url,
        catalog=CATALOG_NAME,
        count=count,
        results=[parse_record(item) for item in results])
