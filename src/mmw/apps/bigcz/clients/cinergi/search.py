# -*- coding: utf-8 -*-
import requests
import dateutil.parser
from html.parser import HTMLParser
from django.contrib.gis.geos import Polygon

from django.conf import settings

from apps.bigcz.models import ResourceLink, ResourceList
from apps.bigcz.utils import RequestTimedOutError, UnexpectedResponseError

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

    if isinstance(links, str):
        links = [links]

    for url in links:
        result.append(ResourceLink('details', url))

    return result


def parse_cinergi_url(fileid):
    """
    Convert fileid to URL in CINERGI Portal
    """

    return '{}/geoportal/?filter=%22{}%22'.format(CINERGI_HOST, fileid)


def parse_string_or_list(string_or_list):
    """
    Fields like contact_organizations be either a list of strings, or
    a string. Make it always a list of strings
    """
    if isinstance(string_or_list, str):
        return [string_or_list]

    return string_or_list


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
       not all(isinstance(c, str) for c in categories):
        # We only handle categories that are lists of strings
        return None

    if isinstance(categories, str):
        categories = [categories]

    split_categories = [category.split(">") for category in categories]
    return [c[len(c) - 1] for c in split_categories]


def parse_time_period(time_period):
    if not time_period:
        return None, None

    time_period_dict = time_period
    if isinstance(time_period, list):
        time_period_dict = time_period[0]

    begin_date = time_period_dict.get('begin_dt')
    end_date = time_period_dict.get('end_dt')
    return begin_date, end_date


def parse_description(description):
    """
    Some cinergi descriptions contain html.
    Parse out the data of the first element so
    we always return a regular string
    """
    if not description:
        return None

    class DescriptionHTMLParser(HTMLParser):
        contents = []

        def handle_data(self, data):
            self.contents.append(data)

    parser = DescriptionHTMLParser()
    parser.feed(description)
    return parser.contents[0]


def parse_web_resources(raw_resources):
    if not raw_resources:
        return []

    resources = raw_resources

    if isinstance(raw_resources, dict):
        resources = [raw_resources]

    return [{
        'url': r.get('url_s'),
        'url_type': r.get('url_type_s')
    } for r in resources]


def parse_web_services(raw_services):
    if not raw_services:
        return []

    services = raw_services

    if isinstance(raw_services, dict):
        services = [raw_services]

    return [{
        'url': s.get('url_s'),
        'url_type': s.get('url_type_s'),
        'url_name': s.get('url_name_s')
    } for s in services]


def parse_record(item):
    source = item['_source']
    geom = parse_geom(source)
    links = parse_links(source)
    begin_date, end_date = parse_time_period(source.get('timeperiod_nst'))
    return CinergiResource(
        id=item['id'],
        title=source['title'],
        description=parse_description(source.get('description')),
        author=None,
        links=links,
        created_at=parse_date(source.get('sys_created_dt')),
        updated_at=parse_date(source.get('src_lastupdate_dt')),
        geom=geom,
        cinergi_url=parse_cinergi_url(source.get('fileid')),
        source_name=source.get('src_source_name_s'),
        contact_organizations=parse_string_or_list(
            source.get('contact_organizations_s')),
        contact_people=parse_string_or_list(
            source.get('contact_people_s')),
        categories=parse_categories(source),
        begin_date=parse_date(begin_date),
        end_date=parse_date(end_date),
        resource_type=source.get('apiso_Type_s'),
        resource_topic_categories=parse_string_or_list(
            source.get('apiso_TopicCategory_s')),
        web_resources=parse_web_resources(source.get('resources_nst')),
        web_services=parse_web_services(source.get('services_nst')))


def prepare_bbox(box):
    return '{},{},{},{}'.format(box.xmin, box.ymin, box.xmax, box.ymax)


def prepare_date(value):
    if not value:
        return ''
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
    if from_date or to_date:
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

    if 'results' not in data:
        raise UnexpectedResponseError()

    results = data['results']
    count = data['total']

    return ResourceList(
        api_url=response.url,
        catalog=CATALOG_NAME,
        count=count,
        results=[parse_record(item) for item in results])
