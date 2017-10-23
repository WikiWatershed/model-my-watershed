# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests
import dateutil.parser
from django.contrib.gis.geos import Polygon

from django.conf import settings

from apps.bigcz.models import ResourceLink, ResourceList
from apps.bigcz.utils import RequestTimedOutError

from apps.bigcz.clients.cinergi.models import CinergiResource


CINERGI_HOST = 'http://cinergi.sdsc.edu'
CATALOG_NAME = 'cinergi'
CATALOG_URL = '{}/geoportal/opensearch'.format(CINERGI_HOST)
PAGE_SIZE = settings.BIGCZ_CLIENT_PAGE_SIZE


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


def parse_cinergi_url(fileid):
    """
    Convert fileid to URL in CINERGI Portal
    """

    return '{}/geoportal/?filter=%22{}%22'.format(CINERGI_HOST, fileid)


def parse_contact_organizations(contact_organizations):
    """
    Contact organizations can be either a list of strings, or
    a string. Make it always a list of strings
    """
    if isinstance(contact_organizations, basestring):
        return [contact_organizations]

    return contact_organizations


def parse_categories(source):
    """
    Categories are lists of the form:
    ["Category > Material > Environmental Material > Water",
     "Category > Property > Measure > Physical Quantity > Flow", ... ]

    Or just a string
     "Category > Property > Measure > Physical Quantity > Flow"

    Return a list of the "leaves" (the string after the last ">")
    ["Water", "Flow", ...]
    """
    categories = source.get('hierarchies_cat',
                            source.get('categories_cat'))
    if not categories or \
       not all(isinstance(c, basestring) for c in categories):
        # We only handle categories that are lists of strings
        return None

    if isinstance(categories, basestring):
        categories = [categories]

    split_categories = [category.split(">") for category in categories]
    return [c[len(c) - 1] for c in split_categories]


def parse_record(item):
    source = item['_source']
    geom = parse_geom(source)
    links = parse_links(source)
    return CinergiResource(
        id=item['_id'],
        title=source['title'],
        description=source.get('description'),
        author=None,
        links=links,
        created_at=parse_date(source.get('sys_created_dt')),
        updated_at=parse_date(source.get('src_lastupdate_dt')),
        geom=geom,
        cinergi_url=parse_cinergi_url(source.get('fileid')),
        source_name=source.get('src_source_name_s'),
        contact_organizations=parse_contact_organizations(
            source.get('contact_organizations_s')),
        categories=parse_categories(source))


def prepare_bbox(box):
    return '{},{},{},{}'.format(box.xmin, box.ymin, box.xmax, box.ymax)


def prepare_date(value):
    return value.strftime('%Y-%m-%d')


def prepare_time(from_date, to_date):
    value = prepare_date(from_date)
    if to_date:
        value = '{}/{}'.format(value, prepare_date(to_date))
    return value


def prepare_query(query):
    """
    Prepare query to always AND all search terms

    Spaces will be replaced with AND. Existing ANDs and ORs will be preserved.
    """
    def intersperse_and(phrase):
        # For a given phrase, intersperse AND between all words,
        # except "and" which is removed
        return ' AND '.join([word for word in phrase.split()
                             if word != 'and'])

    # If the query has any ORs, split it into phrases to be ANDed
    phrases = query.split(' or ')

    # AND words in each phrase, and OR all phrases together
    return ' OR '.join(map(intersperse_and, phrases))


def search(**kwargs):
    query = kwargs.get('query')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    bbox = kwargs.get('bbox')
    page = kwargs.get('page')

    params = {
        'f': 'json',
        'size': PAGE_SIZE,
    }

    if query:
        params.update({
            'q': prepare_query(query.lower())
        })
    if from_date:
        params.update({
            'time': prepare_time(from_date, to_date)
        })
    if bbox:
        params.update({
            'bbox': prepare_bbox(bbox)
        })
    if page:
        params.update({
            # page 1 is from 1, page 2 from 101, page 3 from 201, ...
            'from': PAGE_SIZE * (page - 1) + 1
        })

    try:
        response = requests.get(CATALOG_URL,
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
