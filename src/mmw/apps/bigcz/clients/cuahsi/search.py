# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from datetime import date
from urllib2 import URLError
from socket import timeout
from operator import attrgetter, itemgetter

from suds.client import Client
from suds.sudsobject import asdict
from rest_framework.exceptions import ValidationError
from django.contrib.gis.geos import Point

from django.core.cache import cache
from django.conf import settings

from apps.bigcz.models import ResourceLink, ResourceList, BBox
from apps.bigcz.utils import parse_date, RequestTimedOutError

from apps.bigcz.clients.cuahsi.models import CuahsiResource


SQKM_PER_SQM = 0.000001
CUAHSI_MAX_SIZE_SQKM = 1500
CATALOG_NAME = 'cuahsi'
CATALOG_URL = 'http://hiscentral.cuahsi.org/webservices/hiscentral.asmx?WSDL'


DATE_MIN = date(1900, 1, 1)
DATE_MAX = date(2100, 1, 1)
DATE_FORMAT = '%m/%d/%Y'

GRIDDED = [
    'NWS-WGRFC_Hourly_MPE',
    'NWS_WGRFC_Daily_MPE_Recent_Values',
    'LMRFC_Data',
    'GLDAS_NOAH',
    'NLDAS_FORA',
    'NLDAS_NOAH',
    'TRMM_3B42_7',
]

client = Client(CATALOG_URL, timeout=settings.BIGCZ_CLIENT_TIMEOUT)


def recursive_asdict(d):
    """
    Convert Suds object into serializable format, so it can be cached.
    From https://gist.github.com/robcowie/a6a56cf5b17a86fdf461
    """
    out = {}
    for k, v in asdict(d).iteritems():
        if hasattr(v, '__keylist__'):
            out[k] = recursive_asdict(v)
        elif isinstance(v, list):
            out[k] = []
            for item in v:
                if hasattr(item, '__keylist__'):
                    out[k].append(recursive_asdict(item))
                else:
                    out[k].append(item)
        else:
            out[k] = v
    return out


def filter_networkIDs(services, exclude_gridded=False):
    """
    Transforms list of services to list of ServiceIDs, with respect to
    given options.

    If exclude_gridded=True, then GRIDDED services will not be included.

    If no filters apply, we return an empty list to disable filtering.
    """
    if exclude_gridded:
        return [str(s['ServiceID']) for s in services
                if s['NetworkName'] not in GRIDDED]

    return []


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
    if any(code in location
           for code in ('NWISDV', 'NWISGW', 'NWISUV', 'EnviroDIY')):
        parts = location.split(':')
        if len(parts) == 2:
            code, id = parts
            if code == 'NWISDV':
                url = 'https://waterdata.usgs.gov/nwis/dv/?site_no={}'
                return url.format(id)
            elif code == 'NWISUV':
                url = 'https://waterdata.usgs.gov/nwis/uv/?site_no={}'
                return url.format(id)
            elif code == 'NWISGW':
                url = ('https://nwis.waterdata.usgs.gov/' +
                       'usa/nwis/gwlevels/?site_no={}')
                return url.format(id)
            elif code == 'EnviroDIY':
                url = 'http://data.envirodiy.org/sites/{}/'
                return url.format(id)
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
        title=record['site_name'],
        description=service['aabstract'],
        author=None,
        links=links,
        created_at=record['begin_date'],
        updated_at=None,
        geom=geom,
        details_url=details_url,
        sample_mediums=record['sample_mediums'],
        variables=record['variables'],
        service_org=service['organization'],
        service_code=record['serv_code'],
        service_url=service['ServiceDescriptionURL'],
        service_title=service['Title'],
        service_citation=service['citation'],
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
        service = find_service(services, record['serv_code'])
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
            'serv_code': group[0]['ServCode'],
            'serv_url': group[0]['ServURL'],
            'location': group[0]['location'],
            'site_name': group[0]['Sitename'],
            'latitude': group[0]['latitude'],
            'longitude': group[0]['longitude'],
            'sample_mediums': sorted(set([r['samplemedium']
                                          for r in group])),
            'concept_keywords': sorted(set([r['conceptKeyword']
                                            for r in group])),
            'begin_date': min([parse_date(r['beginDate'])
                               for r in group]),
            'end_date': max([parse_date(r['endDate'])
                             for r in group]),
            'variables': sorted([{
                'id': r['VarCode'],
                'name': r['VarName'],
                'concept_keyword': r['conceptKeyword'],
                'site': r['location'],
                'wsdl': r['ServURL'],
            } for r in group], key=itemgetter('concept_keyword'))
        })

    return records


def make_request(request, expiry, **kwargs):
    key = 'bigcz_cuahsi_{}_{}'.format(request.method.name,
                                      hash(frozenset(kwargs.items())))
    cached = cache.get(key)
    if cached:
        return cached

    try:
        response = recursive_asdict(request(**kwargs))
        cache.set(key, response, timeout=expiry)
        return response
    except URLError, e:
        if isinstance(e.reason, timeout):
            raise RequestTimedOutError()
        else:
            raise
    except timeout:
        raise RequestTimedOutError()


def get_services_in_box(box):
    result = make_request(client.service.GetServicesInBox2,
                          604800,  # Cache for one week
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


def get_series_catalog_in_box(box, from_date, to_date, networkIDs):
    from_date = from_date or DATE_MIN
    to_date = to_date or DATE_MAX

    result = make_request(client.service.GetSeriesCatalogForBox2,
                          300,  # Cache for 5 minutes
                          xmin=box.xmin,
                          xmax=box.xmax,
                          ymin=box.ymin,
                          ymax=box.ymax,
                          conceptKeyword='',
                          networkIDs=','.join(networkIDs),
                          beginDate=from_date.strftime(DATE_FORMAT),
                          endDate=to_date.strftime(DATE_FORMAT))

    try:
        return result['SeriesRecord']
    except KeyError:
        # Empty object can mean "No results"
        if not result:
            return []

        # Missing key may indicate a server-side error
        raise ValueError(result)
    except TypeError:
        # "No results" produces an empty string instead of an object
        return []


def search(**kwargs):
    bbox = kwargs.get('bbox')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    exclude_gridded = 'exclude_gridded' in kwargs.get('options')

    if not bbox:
        raise ValidationError({
            'error': 'Required argument: bbox'})

    bbox_area = bbox.area() * SQKM_PER_SQM

    if bbox_area > CUAHSI_MAX_SIZE_SQKM:
        raise ValidationError({
            'error': 'The selected area of interest with a bounding box of {} '
                     'km² is larger than the currently supported maximum size '
                     'of {} km².'.format(round(bbox_area, 2),
                                          CUAHSI_MAX_SIZE_SQKM)})

    world = BBox(-180, -90, 180, 90)

    services = get_services_in_box(world)
    networkIDs = filter_networkIDs(services, exclude_gridded)
    series = get_series_catalog_in_box(bbox, from_date, to_date, networkIDs)
    series = group_series_by_location(series)
    results = sorted(parse_records(series, services),
                     key=attrgetter('end_date'),
                     reverse=True)

    return ResourceList(
        api_url=None,
        catalog=CATALOG_NAME,
        count=len(results),
        results=results)
