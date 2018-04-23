# -*- coding: utf-8 -*-
from __future__ import (absolute_import,
                        division,
                        print_function,
                        unicode_literals)

from datetime import date
from zipfile import ZipFile
from io import BytesIO

from rest_framework.exceptions import ValidationError
from django.contrib.gis.geos import Point

from django.core.cache import cache

from requests import Request, Session, Timeout
import pandas as pd

from apps.bigcz.models import ResourceList
from apps.bigcz.utils import RequestTimedOutError, get_huc_info

from apps.bigcz.clients.usgswqp.models import USGSResource


SQKM_PER_SQM = 0.000001
USGS_MAX_SIZE_SQKM = 5000
CATALOG_NAME = 'usgswqp'
CATALOG_URL = 'https://www.waterqualitydata.us/data/Station/search'

DATE_MIN = date(1900, 1, 1)
DATE_MAX = date(2100, 1, 1)
DATE_FORMAT = '%m/%d/%Y'


def parse_geom(record):
    lat = float(record['LatitudeMeasure'])
    lng = float(record['LongitudeMeasure'])
    return Point(lng, lat)


def parse_record(record):
    geom = parse_geom(record)

    links = []

    return USGSResource(
        id=record['MonitoringLocationIdentifier'],
        title=record['MonitoringLocationName'],
        description=None,
        author=None,
        links=links,
        created_at=None,
        updated_at=None,
        geom=geom,
        details_url=None,
        sample_mediums=None,
        variables=None,
        service_org=record['OrganizationIdentifier'],
        service_code=record['MonitoringLocationIdentifier'],
        service_url=None,
        service_title=None,
        service_citation=None,
        begin_date=None,
        end_date=None
    )


def search(**kwargs):
    bbox = kwargs.get('bbox')
    to_date = kwargs.get('to_date')
    from_date = kwargs.get('from_date')
    exclude_gridded = 'exclude_gridded' in kwargs.get('options')

    hucgdf = get_huc_info(kwargs.get('geojson'))

    if not bbox:
        raise ValidationError({
            'error': 'Required argument: bbox'})

    bbox_area = bbox.area() * SQKM_PER_SQM

    if bbox_area > USGS_MAX_SIZE_SQKM:
        raise ValidationError({
            'error': 'The selected area of interest with a bounding box of {} '
                     'km² is larger than the currently supported maximum size '
                     'of {} km².'.format(round(bbox_area, 2),
                                         USGS_MAX_SIZE_SQKM)})
    params = {
        # 'bBox': '{0:.3f},{1:.3f},{2:.3f},{3:.3f}'.format(bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax),
        'huc': ';'.join(hucgdf.huc12.unique()),
        'mimeType': 'csv',
        'sorted': 'no',
        'minresults': '1',
        'zip': 'yes'
    }

    session = Session()
    request = session.prepare_request(Request('GET',
                                              CATALOG_URL,
                                              params=params))

    key = 'bigcz_usgswqp_{}'.format(hash(frozenset(params.items())))
    cached = cache.get(key)
    if cached:
        data = pd.DataFrame.from_records(cached)

    else:
        try:
            response = session.send(request)
            print(response.url)
            with ZipFile(BytesIO(response.content)) as z:
                df = pd.read_csv(z.open('station.csv'))
            data = df[['MonitoringLocationIdentifier',
                       'MonitoringLocationName',
                       'OrganizationIdentifier',
                       'OrganizationFormalName',
                       'LongitudeMeasure',
                       'LatitudeMeasure']]
            cache.set(key, data.to_dict(orient='record'), timeout=1800)  # Cache for half hour
        except Timeout:
            raise RequestTimedOutError()
        # print(len(data))

    if len(data) == 0:
        raise ValueError(data)

    results = list(map(lambda record: parse_record(record[1]), data.iterrows()))

    return ResourceList(
        api_url=None,
        catalog=CATALOG_NAME,
        count=len(results),
        results=results)
