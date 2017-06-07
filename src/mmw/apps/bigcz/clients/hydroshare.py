# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests
import dateutil.parser
from rest_framework.exceptions import ValidationError

from apps.bigcz.models import Resource, ResourceLink, ResourceList, BBox


CATALOG_NAME = 'hydroshare'
HYDROSHARE_URL = 'https://www.hydroshare.org/hsapi/resource/'


def parse_date(value):
    return dateutil.parser.parse(value)


def parse_record(item):
    return Resource(
        id=item['resource_id'],
        description=None,
        links=[
            ResourceLink('details', item['resource_url'])
        ],
        title=item['resource_title'],
        created_at=parse_date(item['date_created']),
        updated_at=parse_date(item['date_last_updated']),
        geom=None)


def prepare_bbox(value):
    box = BBox(value)
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

    response = requests.get(HYDROSHARE_URL, params=params)
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
