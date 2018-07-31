# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import fiona
import io
import json
import os
import requests

from celery import shared_task

from django.utils.timezone import now
from django.contrib.gis.geos import GEOSGeometry

from apps.modeling.models import Project
from apps.modeling.tasks import to_gms_file

from hydroshare import HydroShareService
from models import HydroShareResource
from serializers import HydroShareResourceSerializer

hss = HydroShareService()

SHAPEFILE_EXTENSIONS = ['cpg', 'dbf', 'prj', 'shp', 'shx']
DEFAULT_KEYWORDS = {'mmw', 'model-my-watershed'}
MMW_APP_KEY_FLAG = '{"appkey": "model-my-watershed"}'
BMP_SPREADSHEET_TOOL_URL = 'https://github.com/WikiWatershed/MMW-BMP-spreadsheet-tool/raw/master/MMW_BMP_Spreadsheet_Tool.xlsx'  # NOQA


@shared_task
def update_resource(user_id, project_id, params):
    hs = hss.get_client(user_id)
    hsresource = HydroShareResource.objects.get(project_id=project_id)

    existing_files = hs.get_file_list(hsresource.resource)
    if not existing_files:
        raise RuntimeError('HydroShare could not find requested resource')

    current_analyze_files = [
        f['url'][(1 + f['url'].index('/analyze_')):]
        for f in existing_files
        if '/analyze_' in f['url']
    ]

    # Update files
    files = params.get('files', [])
    for md in params.get('mapshed_data', []):
        mdata = md.get('data')
        files.append({
            'name': md.get('name'),
            'contents': to_gms_file(json.loads(mdata)) if mdata else None,
            'object': True
        })

    # Except the existing analyze files
    files = [f for f in files if f['name'] not in current_analyze_files]

    hs.add_files(hsresource.resource, files, overwrite=True)

    hsresource.exported_at = now()
    hsresource.save()

    serializer = HydroShareResourceSerializer(hsresource)
    return serializer.data


@shared_task
def create_resource(user_id, project_id, params):
    hs = hss.get_client(user_id)
    project = Project.objects.get(pk=project_id)

    # Convert keywords from array to set of values
    keywords = params.get('keywords')
    keywords = set(keywords) if keywords else set()

    # POST new resource creates it in HydroShare
    resource = hs.createResource(
        'CompositeResource',
        params.get('title', project.name),
        abstract=params.get('abstract', ''),
        keywords=tuple(DEFAULT_KEYWORDS | keywords),
        extra_metadata=MMW_APP_KEY_FLAG,
    )

    # Files sent from the client
    files = params.get('files', [])

    # AoI GeoJSON
    aoi_geojson = GEOSGeometry(project.area_of_interest).geojson
    files.append({
        'name': 'area-of-interest.geojson',
        'contents': aoi_geojson,
    })

    # MapShed Data
    for md in params.get('mapshed_data', []):
        mdata = md.get('data')
        files.append({
            'name': md.get('name'),
            'contents': to_gms_file(json.loads(mdata)) if mdata else None,
            'object': True
        })

    # Add all files
    hs.add_files(resource, files)

    # AoI Shapefile
    aoi_json = json.loads(aoi_geojson)
    crs = {'no_defs': True, 'proj': 'longlat',
           'ellps': 'WGS84', 'datum': 'WGS84'}
    schema = {'geometry': aoi_json['type'], 'properties': {}}
    with fiona.open('/tmp/{}.shp'.format(resource), 'w',
                    driver='ESRI Shapefile',
                    crs=crs, schema=schema) as shapefile:
        shapefile.write({'geometry': aoi_json, 'properties': {}})

    for ext in SHAPEFILE_EXTENSIONS:
        filename = '/tmp/{}.{}'.format(resource, ext)
        with open(filename) as shapefile:
            hs.addResourceFile(resource, shapefile,
                               'area-of-interest.{}'.format(ext))
        os.remove(filename)

    # MapShed BMP Spreadsheet Tool
    if params.get('mapshed_data'):
        response = requests.get(BMP_SPREADSHEET_TOOL_URL,
                                allow_redirects=True, stream=True)
        hs.addResourceFile(resource, io.BytesIO(response.content),
                           'MMW_BMP_Spreadsheet_Tool.xlsx')

    # Make resource public and shareable
    endpoint = hs.resource(resource)
    endpoint.public(True)
    endpoint.shareable(True)

    # Add geographic coverage
    endpoint.functions.set_file_type({
        'file_path': 'area-of-interest.shp',
        'hs_file_type': 'GeoFeature',
    })

    # Link HydroShareResrouce to Project and save
    hsresource = HydroShareResource.objects.create(
        project=project,
        resource=resource,
        title=params.get('title', project.name),
        autosync=params.get('autosync', True),
        exported_at=now()
    )
    hsresource.save()

    # Make Project public and save
    project.is_private = False
    project.save()

    # Return newly created HydroShareResource
    serializer = HydroShareResourceSerializer(hsresource)
    return serializer.data
