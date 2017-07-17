# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from datetime import date
from urllib2 import URLError
from socket import timeout

from suds.client import Client
from rest_framework.exceptions import ValidationError
from django.contrib.gis.geos import Point

from django.conf import settings

from apps.bigcz.models import ResourceLink, ResourceList, BBox
from apps.bigcz.utils import parse_date, RequestTimedOutError

from apps.bigcz.clients.cuahsi.models import CuahsiResource


SQKM_PER_SQM = 0.000001
MAX_AREA_SQKM = 1500
CATALOG_NAME = 'cuahsi'
CATALOG_URL = 'http://hiscentral.cuahsi.org/webservices/hiscentral.asmx?WSDL'


DATE_MIN = date(1900, 1, 1)
DATE_MAX = date(2100, 1, 1)
DATE_FORMAT = '%m/%d/%Y'


client = Client(CATALOG_URL, timeout=settings.BIGCZ_CLIENT_TIMEOUT)


def parse_geom(record):
    lat = record['latitude']
    lng = record['longitude']
    return Point(lng, lat)


def parse_details_url(record):
    """
    > Site URLs can be similarly constructed from some Services,
    > such as https://waterdata.usgs.gov/nwis/uv/?site_no=14113000, when
    > ServCode = "NWISDV" and location = "NWISDV:14113000"

    Ref: https://github.com/WikiWatershed/model-my-watershed/issues/1931
    """
    location = record['location']
    if 'NWISDV' in location:
        parts = location.split(':')
        if len(parts) == 2:
            _, id = parts
            return 'https://waterdata.usgs.gov/nwis/uv/?site_no={}'.format(id)
    return None


def parse_record(record, service):
    geom = parse_geom(record)

    links = [
        ResourceLink('service', service['ServiceDescriptionURL'])
    ]

    details_url = parse_details_url(record)
    if details_url:
        links.append(ResourceLink('details', details_url))

    return CuahsiResource(
        id=record['location'],
        title=record['Sitename'],
        description=service['aabstract'],
        author=None,
        links=links,
        created_at=record['begin_date'],
        updated_at=None,
        geom=geom,
        details_url=details_url,
        sample_mediums=record['sample_mediums'],
        concept_keywords=record['concept_keywords'],
        service_org=service['organization'],
        service_code=record['ServCode'],
        service_url=service['ServiceDescriptionURL'],
        begin_date=record['begin_date'],
        end_date=record['end_date']
    )


def find_service(services, service_code):
    for service in services:
        if service['NetworkName'] == service_code:
            return service
    return None


def parse_records(series, services):
    """
    Join series catalog records to corresponding service.
    """
    result = []
    for record in series:
        service = find_service(services, record['ServCode'])
        if service:
            record = parse_record(record, service)
            result.append(record)
    return result


def group_series_by_location(series):
    """
    Group series catalog results by location. Each result contains fields
    common across all variables, and some aggregations.

    Ref: https://github.com/WikiWatershed/model-my-watershed/issues/1931
    """
    groups = {}
    for record in series:
        group = groups.get(record['location'])
        if not group:
            groups[record['location']] = [record]
        else:
            group.append(record)

    records = []
    for location, group in groups.iteritems():
        records.append({
            'ServCode': group[0]['ServCode'],
            'ServURL': group[0]['ServURL'],
            'location': group[0]['location'],
            'Sitename': group[0]['Sitename'],
            'latitude': group[0]['latitude'],
            'longitude': group[0]['longitude'],
            'sample_mediums': ', '.join(sorted(set([r['samplemedium']
                                                    for r in group]))),
            'concept_keywords': '; '.join(sorted(set([r['conceptKeyword']
                                                      for r in group]))),
            'begin_date': min([parse_date(r['beginDate'])
                               for r in group]),
            'end_date': max([parse_date(r['endDate'])
                             for r in group]),
        })

    return records


def make_request(request, **kwargs):
    try:
        return request(**kwargs)
    except URLError, e:
        if isinstance(e.reason, timeout):
            raise RequestTimedOutError()
        else:
            raise
    except timeout:
        raise RequestTimedOutError()


def get_services_in_box(box):
    result = make_request(client.service.GetServicesInBox2,
                          xmin=box.xmin,
                          xmax=box.xmax,
                          ymin=box.ymin,
                          ymax=box.ymax)

    try:
        return result['ServiceInfo']
    except KeyError:
        # Missing key may indicate a server-side error
        raise ValueError(result)
    except TypeError:
        # "No results" produces an empty string instead of an object
        return []


def get_series_catalog_in_box(box, from_date, to_date):
    from_date = from_date or DATE_MIN
    to_date = to_date or DATE_MAX

    result = make_request(client.service.GetSeriesCatalogForBox2,
                          xmin=box.xmin,
                          xmax=box.xmax,
                          ymin=box.ymin,
                          ymax=box.ymax,
                          conceptKeyword='',
                          networkIDs='',
                          beginDate=from_date.strftime(DATE_FORMAT),
                          endDate=to_date.strftime(DATE_FORMAT))

    try:
        return result['SeriesRecord']
    except KeyError:
        # Missing key may indicate a server-side error
        raise ValueError(result)
    except TypeError:
        # "No results" produces an empty string instead of an object
        return []


def search(**kwargs):
    bbox = kwargs.get('bbox')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')

    if not bbox:
        raise ValidationError({
            'error': 'Required argument: bbox'})

    box = BBox(bbox)
    world = BBox('-180,-90,180,90')

    series = get_series_catalog_in_box(box, from_date, to_date)
    series = group_series_by_location(series)
    services = get_services_in_box(world)
    results = parse_records(series, services)

    return ResourceList(
        api_url=None,
        catalog=CATALOG_NAME,
        count=len(results),
        results=results)
