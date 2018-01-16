# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import fiona
import json
import os

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404
from django.utils.timezone import now

from rest_framework import decorators, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from apps.modeling.models import Project
from apps.modeling.tasks import to_gms_file

from hydroshare import HydroShareService
from models import HydroShareResource
from serializers import HydroShareResourceSerializer

hss = HydroShareService()
HYDROSHARE_BASE_URL = settings.HYDROSHARE['base_url']
SHAPEFILE_EXTENSIONS = ['cpg', 'dbf', 'prj', 'shp', 'shx']


@decorators.api_view(['GET', 'POST', 'PATCH', 'DELETE'])
@decorators.permission_classes((IsAuthenticated, ))
def hydroshare(request):
    # Get HydroShare client with user's credentials
    try:
        hs = hss.get_client(request.user)
    except ObjectDoesNotExist:
        return Response(
            data={'errors': ['User not connected to HydroShare']},
            status=status.HTTP_401_UNAUTHORIZED
        )

    project_id = request.GET.get('project')
    if not project_id:
        # No support for exporting without a project right now
        return Response(
            data={'errors': ['Cannot export to HydroShare without project']},
            status=status.HTTP_400_BAD_REQUEST
        )

    params = request.data
    project = get_object_or_404(Project, id=project_id,
                                user__id=request.user.id)

    try:
        hsresource = HydroShareResource.objects.get(project=project)
    except HydroShareResource.DoesNotExist:
        hsresource = None

    # GET existing resource simply returns it
    if hsresource and request.method == 'GET':
        if not hs.check_resource_exists(hsresource.resource):
            return Response(
                data={
                    'errors': ['HydroShare could not find requested resource']
                },
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = HydroShareResourceSerializer(hsresource)
        return Response(serializer.data)

    # PATCH existing resource updates its autosync status
    if hsresource and request.method == 'PATCH':
        autosync = params.get('autosync', None)
        if autosync is None:
            return Response(
                data={'errors': ['Must specify autosync as true or false']},
                status=status.HTTP_400_BAD_REQUEST
            )
        hsresource.autosync = autosync
        hsresource.save()
        serializer = HydroShareResourceSerializer(hsresource)
        return Response(serializer.data)

    # DELETE existing resource removes it from MMW and HydroShare
    if hsresource and request.method == 'DELETE':
        if hs.check_resource_exists(hsresource.resource):
            hs.deleteResource(hsresource.resource)
        hsresource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Cannot GET, PATCH or DELETE non-existing resource
    if not hsresource and request.method in ['GET', 'PATCH', 'DELETE']:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # POST existing resource updates it
    if hsresource and request.method == 'POST':
        # Make sure resource still exists on hydroshare
        if not hs.check_resource_exists(hsresource.resource):
            return Response(
                data={
                    'errors': ['HydroShare could not find requested resource']
                },
                status=status.HTTP_404_NOT_FOUND
            )

        # Update files
        files = params.get('files', [])
        for md in params.get('mapshed_data', []):
            mdata = md.get('data')
            files.append({
                'name': md.get('name'),
                'contents': to_gms_file(json.loads(mdata)) if mdata else None,
                'object': True
            })

        hs.add_files(hsresource.resource, files, overwrite=True)

        hsresource.exported_at = now()
        hsresource.save()

        serializer = HydroShareResourceSerializer(hsresource)
        return Response(serializer.data)

    # Convert keywords from comma seperated string to tuple of values
    keywords = params.get('keywords')
    keywords = \
        tuple(map(unicode.strip, keywords.split(','))) if keywords else tuple()

    # POST new resource creates it in HydroShare
    resource = hs.createResource(
        'CompositeResource',
        params.get('title', project.name),
        abstract=params.get('abstract', ''),
        keywords=('mmw', 'model-my-watershed') + keywords
    )

    # TODO Re-enable once hydroshare/hydroshare#2537 is fixed,
    #      and export all GeoJSON and Shapefiles in that folder

    # aoi_folder = 'area-of-interest'
    # hs.createResourceFolder(resource, pathname=aoi_folder)

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

    # Link HydroShareResrouce to Project and save
    hsresource = HydroShareResource.objects.create(
        project=project,
        resource=resource,
        title=params.get('title', project.name),
        autosync=params.get('autosync', True),
        exported_at=now()
    )
    hsresource.save()

    # Return newly created HydroShareResource
    serializer = HydroShareResourceSerializer(hsresource)
    return Response(serializer.data, status=status.HTTP_201_CREATED)
