# -*- coding: utf-8 -*-
from __future__ import (absolute_import,
                        division,
                        print_function,
                        unicode_literals)
import requests

from datetime import date
from zipfile import ZipFile
from io import BytesIO

from rest_framework.exceptions import ValidationError

from django.contrib.gis.geos import Point
from django.db import connection

from apps.bigcz.models import ResourceList
from apps.bigcz.utils import read_unicode_csv, RequestTimedOutError

from apps.bigcz.clients.usgswqp.models import USGSResource


SQKM_PER_SQM = 0.000001
USGS_MAX_SIZE_SQKM = 5000
CATALOG_NAME = 'usgswqp'
CATALOG_URL = 'https://www.waterqualitydata.us/data/Station/search'

DATE_MIN = date(1900, 1, 1)
DATE_MAX = date(2100, 1, 1)
DATE_FORMAT = '%m/%d/%Y'


def unique_huc12s_in(geojson):
    sql = '''
          SELECT DISTINCT huc12
          FROM boundary_huc12
          WHERE ST_Intersects(geom, ST_SetSRID(ST_GeomFromGeoJSON(%s), 4326))
          '''

    with connection.cursor() as cursor:
        cursor.execute(sql, [geojson])

        return ';'.join([row[0] for row in cursor.fetchall()])


def parse_geom(record):
    lat = float(record['LatitudeMeasure'])
    lng = float(record['LongitudeMeasure'])
    return Point(lng, lat)


def parse_record(record):
    geom = parse_geom(record)

    links = []
    monitoring_description = record['MonitoringLocationDescriptionText']

    return USGSResource(
        id=record['MonitoringLocationIdentifier'],
        title=record['MonitoringLocationName'],
        description=monitoring_description,
        author=None,
        links=links,
        created_at=None,
        updated_at=None,
        geom=geom,
        details_url='https://www.waterqualitydata.us/provider/{prov}/{org}/{id}/'.format(prov=record['ProviderName'],  # NOQA
                                                                                         org=record['OrganizationIdentifier'],  # NOQA
                                                                                         id=record['MonitoringLocationIdentifier']),  # NOQA
        sample_mediums=None,
        variables=None,
        service_org=record['OrganizationIdentifier'],
        service_orgname=record['OrganizationFormalName'],
        service_code=record['MonitoringLocationIdentifier'],
        service_url='https://www.waterqualitydata.us/data/Result/search?siteid={}&mimeType=csv&sorted=no&zip=yes'.format(record['MonitoringLocationIdentifier']),  # NOQA
        service_title=None,
        service_citation='National Water Quality Monitoring Council, [YEAR]. Water Quality Portal. Accessed [DATE ACCESSED]. https://www.waterqualitydata.us/',  # NOQA
        begin_date=None,
        end_date=None,
        monitoring_type=record['MonitoringLocationTypeName'],
        provider_name=record['ProviderName']
    )


def search(**kwargs):
    bbox = kwargs.get('bbox')
    # Currently not being used
    # to_date = kwargs.get('to_date')
    # from_date = kwargs.get('from_date')

    if not bbox:
        raise ValidationError({
            'error': 'Required argument: bbox'})

    bbox_area = bbox.area() * SQKM_PER_SQM

    if bbox_area > USGS_MAX_SIZE_SQKM:
        raise ValidationError({
            'error': 'The selected area of interest with a bounding box of {} '
                     'km² is larger than the currently supported maximum size '
                     'of {} km².'.format(round(bbox_area, 2), USGS_MAX_SIZE_SQKM)})  # NOQA
    params = {
        # bBox might be used in the future
        # 'bBox': '{0:.3f},{1:.3f},{2:.3f},{3:.3f}'.format(bbox.xmin, bbox.ymin, bbox.xmax, bbox.ymax),  # NOQA
        'huc': unique_huc12s_in(kwargs.get('geojson')),
        'mimeType': 'csv',
        'sorted': 'no',
        'minresults': '1',
        'zip': 'yes'
    }

    try:
        response = requests.get(CATALOG_URL, params=params)
        with ZipFile(BytesIO(response.content)) as z:
            data = read_unicode_csv(z.open(z.filelist[0].filename))
    except requests.Timeout:
        raise RequestTimedOutError()

    if not data:
        raise ValueError('Could not fetch data from USGS WQP portal.')

    results = [parse_record(row) for row in data]

    return ResourceList(
        api_url=response.url,
        catalog=CATALOG_NAME,
        count=len(results),
        results=results)
