# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from datetime import date

from suds.client import Client
from rest_framework.exceptions import ValidationError
from django.contrib.gis.geos import Point, Polygon

from apps.bigcz.models import Resource, ResourceLink, ResourceList, BBox
from apps.bigcz.utils import parse_date


SQKM_PER_SQM = 0.000001
MAX_AREA_SQKM = 1500
CATALOG_NAME = 'cuahsi'
SOAP_URL = 'http://hiscentral.cuahsi.org/webservices/hiscentral.asmx?WSDL'


DATE_MIN = date(1900, 1, 1)
DATE_MAX = date(2100, 1, 1)
DATE_FORMAT = '%m/%d/%Y'


client = Client(SOAP_URL)


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

    return Resource(
        id=record['location'],
        title=record['Sitename'],
        description=service['aabstract'],
        author=None,
        links=links,
        created_at=record['beginDate'],
        updated_at=None,
        geom=geom)


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
    common across all variables.

    Ref: https://github.com/WikiWatershed/model-my-watershed/issues/1931
    """
    result = {}
    for record in series:
        location = record['location']
        if location not in result:
            result[location] = {
                'ServCode': record['ServCode'],
                'ServURL': record['ServURL'],
                'Sitename': record['Sitename'],
                'latitude': record['latitude'],
                'location': record['location'],
                'longitude': record['longitude'],
                'beginDate': parse_date(record['beginDate']),
                'endDate': parse_date(record['endDate']),
            }
    return result.values()


def get_services_in_box(box):
    result = client.service.GetServicesInBox2(
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
    result = client.service.GetSeriesCatalogForBox2(
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

    bbox_polygon = Polygon.from_bbox([float(i) for i in bbox.split(',')])
    bbox_polygon.set_srid(4326)
    bbox_area = bbox_polygon.transform(5070, clone=True).area * SQKM_PER_SQM
    if bbox_area > MAX_AREA_SQKM:
        raise ValidationError({
            'error': 'bbox area of {} km² is too large. '
                     'Current max limit is {} km²'
                     .format(bbox_area, MAX_AREA_SQKM)})

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
