# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from suds.client import Client
from rest_framework.exceptions import ValidationError
from django.contrib.gis.geos import Point

from apps.bigcz.models import Resource, ResourceLink, ResourceList, BBox


CATALOG_NAME = 'cuahsi'
SOAP_URL = 'http://hiscentral.cuahsi.org/webservices/hiscentral.asmx?WSDL'


client = Client(SOAP_URL)


def parse_geom(site):
    lat = site['Latitude']
    lng = site['Longitude']
    return Point(lng, lat)


def parse_record(site, service):
    geom = parse_geom(site)
    return Resource(
        id=site['SiteCode'],
        title=site['SiteName'],
        description=service['aabstract'],
        author=None,
        links=[
            ResourceLink('details', service['ServiceDescriptionURL'])
        ],
        created_at=None,
        updated_at=None,
        geom=geom)


def find_service(services, service_code):
    for service in services:
        if service['NetworkName'] == service_code:
            return service
    return None


def parse_records(sites, services):
    result = []
    for site in sites:
        service = find_service(services, site['servCode'])
        if service:
            record = parse_record(site, service)
            result.append(record)
    return result


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


def get_sites_in_box(box):
    result = client.service.GetSitesInBox2(
        xmin=box.xmin,
        xmax=box.xmax,
        ymin=box.ymin,
        ymax=box.ymax,
        conceptKeyword='',
        networkIDs='')
    try:
        return result['Site']
    except KeyError:
        # Missing key may indicate a server-side error
        raise ValueError(result)
    except TypeError:
        # "No results" produces an empty string instead of an object
        return []


def search(**kwargs):
    bbox = kwargs.get('bbox')

    if not bbox:
        raise ValidationError({
            'error': 'Required argument: bbox'})

    box = BBox(bbox)
    world = BBox('-180,-90,180,90')

    sites = get_sites_in_box(box)
    services = get_services_in_box(world)
    results = parse_records(sites, services)

    return ResourceList(
        api_url=None,
        catalog=CATALOG_NAME,
        count=len(results),
        results=results)
