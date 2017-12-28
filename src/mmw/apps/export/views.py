# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import fiona
import json
import os
import StringIO

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import get_object_or_404
from django.utils.timezone import now

from rest_framework import decorators, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from hs_restclient import HydroShareNotFound

from apps.modeling.models import Project, HydroShareResource
from apps.modeling.serializers import HydroShareResourceSerializer
from apps.user.hydroshare import HydroShareService

hss = HydroShareService()
HYDROSHARE_BASE_URL = settings.HYDROSHARE['base_url']
SHAPEFILE_EXTENSIONS = ['cpg', 'dbf', 'prj', 'shp', 'shx']


@decorators.api_view(['GET', 'POST', 'DELETE'])
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
        serializer = HydroShareResourceSerializer(hsresource)
        return Response(serializer.data)

    # DELETE existing resource removes it from MMW and HydroShare
    if hsresource and request.method == 'DELETE':
        hs.deleteResource(hsresource.resource)
        hsresource.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # Cannot GET or DELETE non-existing resource
    if not hsresource and request.method in ['GET', 'DELETE']:
        return Response(status=status.HTTP_404_NOT_FOUND)

    # POST existing resource updates it
    if hsresource and request.method == 'POST':
        # Update files
        files = params.get('files', [])
        for f in files:
            fcontents = f.get('contents')
            fname = f.get('name')
            if fcontents and fname:
                fio = StringIO.StringIO()
                fio.write(fcontents)
                # Delete the file if it already exists
                try:
                    hs.deleteResourceFile(hsresource.resource, fname)
                except HydroShareNotFound:
                    pass
                # Add the new file
                hs.addResourceFile(hsresource.resource, fio, fname)

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

    # AoI GeoJSON
    aoi_geojson = GEOSGeometry(project.area_of_interest).geojson
    aoi_file = StringIO.StringIO()
    aoi_file.write(aoi_geojson)
    hs.addResourceFile(resource, aoi_file, 'area-of-interest.geojson')

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

    # Other files sent from the client
    # Must be in {name: "string", contents: "string"} format
    files = params.get('files', [])
    for f in files:
        fcontents = f.get('contents')
        fname = f.get('name')
        if fcontents and fname:
            fio = StringIO.StringIO()
            fio.write(fcontents)
            hs.addResourceFile(resource, fio, fname)

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
