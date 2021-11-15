# -*- coding: utf-8 -*-
import fiona
import io
import json
import os
import requests

from celery import shared_task

from django.utils.timezone import now
from django.contrib.gis.geos import GEOSGeometry

from apps.modeling.models import Project, Scenario
from apps.modeling.tasks import to_gms_file

from apps.export.hydroshare import HydroShareService
from apps.export.models import HydroShareResource
from apps.export.serializers import HydroShareResourceSerializer

hss = HydroShareService()

SHAPEFILE_EXTENSIONS = ['cpg', 'dbf', 'prj', 'shp', 'shx']
DEFAULT_KEYWORDS = {'mmw', 'model-my-watershed'}
MMW_APP_KEY_FLAG = '{"appkey": "model-my-watershed"}'
BMP_SPREADSHEET_TOOL_URL = 'https://github.com/WikiWatershed/MMW-BMP-spreadsheet-tool/raw/master/MMW_BMP_Spreadsheet_Tool.xlsx'  # NOQA
SQKM_PER_SQM = 1.0E-06


@shared_task(time_limit=300)
def update_resource(user_id, project_id, params):
    hs = hss.get_client(user_id)
    hsresource = HydroShareResource.objects.get(project_id=project_id)

    if not hs.check_resource_exists(hsresource.resource):
        raise RuntimeError('HydroShare could not find requested resource')

    # Update files
    files = _hs_gather_client_files(params)

    hs.add_files(hsresource.resource, files)

    hsresource.exported_at = now()
    hsresource.save()

    serializer = HydroShareResourceSerializer(hsresource)
    return serializer.data


@shared_task(time_limit=300)
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
    files = _hs_gather_client_files(params)

    # AoI GeoJSON
    aoi_geojson = GEOSGeometry(project.area_of_interest).geojson
    files.append({
        'name': 'area-of-interest.geojson',
        'contents': aoi_geojson,
    })

    # Add all files
    hs.add_files(resource, files)

    # AoI Shapefile
    aoi_json = json.loads(aoi_geojson)
    crs = {'no_defs': True, 'proj': 'longlat',
           'ellps': 'WGS84', 'datum': 'WGS84'}
    schema = {'geometry': aoi_json['type'], 'properties': {}}
    with fiona.open(f'/tmp/{resource}.shp', 'w',
                    driver='ESRI Shapefile',
                    crs=crs, schema=schema) as shapefile:
        shapefile.write({'geometry': aoi_json, 'properties': {}})

    for ext in SHAPEFILE_EXTENSIONS:
        filename = f'/tmp/{resource}.{ext}'
        with open(filename) as shapefile:
            hs.addResourceFile(resource, shapefile, f'area-of-interest.{ext}')
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

    # Link HydroShareResource to Project and save
    hsresource = HydroShareResource.objects.create(
        project=project,
        resource=resource,
        title=params.get('title', project.name),
        autosync=params.get('autosync', False),
        exported_at=now()
    )
    hsresource.save()

    # Make Project public and save
    project.is_private = False
    project.save()

    # Return newly created HydroShareResource
    serializer = HydroShareResourceSerializer(hsresource)
    return serializer.data


def _hs_gather_client_files(params):
    # Files sent from the client
    files = params.get('files', [])

    # MapShed Data
    for md in params.get('mapshed_data', []):
        mdata = md.get('data')
        files.append({
            'name': md.get('name'),
            'contents': to_gms_file(mdata).read() if mdata else None,
        })

    # Weather Data
    for wd in params.get('weather_data', []):
        s = Scenario.objects.get(id=wd.get('id'))
        files.append({
            'name': wd.get('name'),
            'contents': s.weather_custom.read(),
        })

    return files


@shared_task
def padep_worksheet(results):
    """
    Given a dictionary of results for areas of interest and HUC-12s, indexed
    by the filename, transforms the results into a payload for generating
    an Excel worksheet.
    """
    payload = []

    for k, v in results.items():
        huc12_stream_length_km = sum(
            [c['lengthkm'] for c in v['huc12']['streams']['categories']])
        huc12_stream_ag_pct = \
            v['huc12']['streams']['categories'][0]['ag_stream_pct']
        huc12_stream_ag_length_km = \
            huc12_stream_length_km * huc12_stream_ag_pct
        huc12_stream_urb_length_km = \
            huc12_stream_length_km - huc12_stream_ag_length_km

        huc12_nlcd = {c['nlcd']: (c['area'] / 1.00000E+06)
                      for c in v['huc12']['nlcd']['categories']}

        aoi_stream_length_km = sum(
            [c['lengthkm'] for c in v['aoi']['streams']['categories']])
        aoi_stream_ag_pct = \
            v['aoi']['streams']['categories'][0]['ag_stream_pct']
        aoi_stream_ag_length_km = \
            aoi_stream_length_km * aoi_stream_ag_pct
        aoi_stream_urb_length_km = \
            aoi_stream_length_km - aoi_stream_ag_length_km

        date = now()

        spec = {
            'C11': date.strftime('%Y-%m-%d'),  # Date Data Entered
            'C13': v['name'],  # Watershed
            'C14': date.strftime('%Y'),  # Year
            'L18': round(huc12_stream_length_km, 2),  # Total Length # NOQA
            'L19': round(huc12_stream_ag_length_km, 2),  # Ag Streams # NOQA
            'L20': round(huc12_stream_urb_length_km, 2),  # Non-Ag Streams # NOQA
            'L27': round(v['huc12']['mapshed']['NumAnimals'][2], 2),  # Chickens, Broilers # NOQA
            'L28': round(v['huc12']['mapshed']['NumAnimals'][3], 2),  # Chickens, Layers # NOQA
            'L29': round(v['huc12']['mapshed']['NumAnimals'][1], 2),  # Cows, Beef # NOQA
            'L30': round(v['huc12']['mapshed']['NumAnimals'][0], 2),  # Cows, Dairy # NOQA
            'L31': round(v['huc12']['mapshed']['NumAnimals'][6], 2),  # Horses # NOQA
            'L32': round(v['huc12']['mapshed']['NumAnimals'][4], 2),  # Pigs/Hogs/Swine # NOQA
            'L33': round(v['huc12']['mapshed']['NumAnimals'][5], 2),  # Sheep # NOQA
            'L34': round(v['huc12']['mapshed']['NumAnimals'][7], 2),  # Turkeys # NOQA
            'D48': round(huc12_nlcd.get(11, 0), 2),  # Open Water # NOQA
            'D49': round(huc12_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
            'D50': round(huc12_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
            'D51': round(huc12_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
            'D52': round(huc12_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
            'D53': round(huc12_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
            'D54': round(huc12_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
            'D55': round(huc12_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
            'D56': round(huc12_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
            'D57': round(huc12_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
            'D58': round(huc12_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
            'D59': round(huc12_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
            'D60': round(huc12_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
            'D61': round(huc12_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
            'D62': round(huc12_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
            'D63': round(huc12_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            'K48': round(v['huc12']['gwlfe']['Loads'][0]['Sediment'], 2),  # Hay/Pasture # NOQA
            'K49': round(v['huc12']['gwlfe']['Loads'][1]['Sediment'], 2),  # Cropland # NOQA
            'K50': round(v['huc12']['gwlfe']['Loads'][2]['Sediment'], 2),  # Wooded Areas # NOQA
            'K51': round(v['huc12']['gwlfe']['Loads'][3]['Sediment'], 2),  # Wetlands # NOQA
            'K52': round(v['huc12']['gwlfe']['Loads'][4]['Sediment'], 2),  # Open Land # NOQA
            'K53': round(v['huc12']['gwlfe']['Loads'][5]['Sediment'], 2),  # Barren Areas # NOQA
            'K54': round(v['huc12']['gwlfe']['Loads'][6]['Sediment'], 2),  # Low-Density Mixed # NOQA
            'K55': round(v['huc12']['gwlfe']['Loads'][7]['Sediment'], 2),  # Medium-Density Mixed # NOQA
            'K56': round(v['huc12']['gwlfe']['Loads'][8]['Sediment'], 2),  # High-Density Mixed # NOQA
            'K57': round(v['huc12']['gwlfe']['Loads'][9]['Sediment'], 2),  # Other Upland Areas # NOQA
            'K58': round(v['huc12']['gwlfe']['Loads'][10]['Sediment'], 2),  # Farm Animals # NOQA
            'K59': round(v['huc12']['gwlfe']['Loads'][11]['Sediment'], 2),  # Stream Bank Erosion # NOQA
            'K60': round(v['huc12']['gwlfe']['Loads'][12]['Sediment'], 2),  # Subsurface Flow # NOQA
            'K61': round(v['huc12']['gwlfe']['Loads'][13]['Sediment'], 2),  # Point Sources # NOQA
            'K62': round(v['huc12']['gwlfe']['Loads'][14]['Sediment'], 2),  # Septic Systems # NOQA
            'L48': round(v['huc12']['gwlfe']['Loads'][0]['TotalN'], 2),  # Hay/Pasture # NOQA
            'L49': round(v['huc12']['gwlfe']['Loads'][1]['TotalN'], 2),  # Cropland # NOQA
            'L50': round(v['huc12']['gwlfe']['Loads'][2]['TotalN'], 2),  # Wooded Areas # NOQA
            'L51': round(v['huc12']['gwlfe']['Loads'][3]['TotalN'], 2),  # Wetlands # NOQA
            'L52': round(v['huc12']['gwlfe']['Loads'][4]['TotalN'], 2),  # Open Land # NOQA
            'L53': round(v['huc12']['gwlfe']['Loads'][5]['TotalN'], 2),  # Barren Areas # NOQA
            'L54': round(v['huc12']['gwlfe']['Loads'][6]['TotalN'], 2),  # Low-Density Mixed # NOQA
            'L55': round(v['huc12']['gwlfe']['Loads'][7]['TotalN'], 2),  # Medium-Density Mixed # NOQA
            'L56': round(v['huc12']['gwlfe']['Loads'][8]['TotalN'], 2),  # High-Density Mixed # NOQA
            'L57': round(v['huc12']['gwlfe']['Loads'][9]['TotalN'], 2),  # Other Upland Areas # NOQA
            'L58': round(v['huc12']['gwlfe']['Loads'][10]['TotalN'], 2),  # Farm Animals # NOQA
            'L59': round(v['huc12']['gwlfe']['Loads'][11]['TotalN'], 2),  # Stream Bank Erosion # NOQA
            'L60': round(v['huc12']['gwlfe']['Loads'][12]['TotalN'], 2),  # Subsurface Flow # NOQA
            'L61': round(v['huc12']['gwlfe']['Loads'][13]['TotalN'], 2),  # Point Sources # NOQA
            'L62': round(v['huc12']['gwlfe']['Loads'][14]['TotalN'], 2),  # Septic Systems # NOQA
            'M48': round(v['huc12']['gwlfe']['Loads'][0]['TotalP'], 2),  # Hay/Pasture # NOQA
            'M49': round(v['huc12']['gwlfe']['Loads'][1]['TotalP'], 2),  # Cropland # NOQA
            'M50': round(v['huc12']['gwlfe']['Loads'][2]['TotalP'], 2),  # Wooded Areas # NOQA
            'M51': round(v['huc12']['gwlfe']['Loads'][3]['TotalP'], 2),  # Wetlands # NOQA
            'M52': round(v['huc12']['gwlfe']['Loads'][4]['TotalP'], 2),  # Open Land # NOQA
            'M53': round(v['huc12']['gwlfe']['Loads'][5]['TotalP'], 2),  # Barren Areas # NOQA
            'M54': round(v['huc12']['gwlfe']['Loads'][6]['TotalP'], 2),  # Low-Density Mixed # NOQA
            'M55': round(v['huc12']['gwlfe']['Loads'][7]['TotalP'], 2),  # Medium-Density Mixed # NOQA
            'M56': round(v['huc12']['gwlfe']['Loads'][8]['TotalP'], 2),  # High-Density Mixed # NOQA
            'M57': round(v['huc12']['gwlfe']['Loads'][9]['TotalP'], 2),  # Other Upland Areas # NOQA
            'M58': round(v['huc12']['gwlfe']['Loads'][10]['TotalP'], 2),  # Farm Animals # NOQA
            'M59': round(v['huc12']['gwlfe']['Loads'][11]['TotalP'], 2),  # Stream Bank Erosion # NOQA
            'M60': round(v['huc12']['gwlfe']['Loads'][12]['TotalP'], 2),  # Subsurface Flow # NOQA
            'M61': round(v['huc12']['gwlfe']['Loads'][13]['TotalP'], 2),  # Point Sources # NOQA
            'M62': round(v['huc12']['gwlfe']['Loads'][14]['TotalP'], 2),  # Septic Systems # NOQA
            'N79': round(aoi_stream_length_km, 2),
            'N80': round(aoi_stream_ag_length_km, 2),
            'N81': round(aoi_stream_urb_length_km, 2),
        }

        aoi_total_area = sum(
            [c['area'] for c in v['aoi']['nlcd']['categories']])

        if aoi_total_area > 2 / SQKM_PER_SQM:
            # Use SQKM block for Area of Interest
            aoi_nlcd = {c['nlcd']: (c['area'] * SQKM_PER_SQM)
                        for c in v['aoi']['nlcd']['categories']}
            spec.update({
                'D73': round(aoi_nlcd.get(11, 0), 2),  # Open Water # NOQA
                'D74': round(aoi_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
                'D75': round(aoi_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
                'D76': round(aoi_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
                'D77': round(aoi_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
                'D78': round(aoi_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
                'D79': round(aoi_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
                'D80': round(aoi_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
                'D81': round(aoi_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
                'D82': round(aoi_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
                'D83': round(aoi_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
                'D84': round(aoi_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
                'D85': round(aoi_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
                'D86': round(aoi_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
                'D87': round(aoi_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
                'D88': round(aoi_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            })
        else:
            # Use SQM block for Area of Interest
            aoi_nlcd = {c['nlcd']: (c['area'])
                        for c in v['aoi']['nlcd']['categories']}
            spec.update({
                'D94': round(aoi_nlcd.get(11, 0), 2),  # Open Water # NOQA
                'D95': round(aoi_nlcd.get(12, 0), 2),  # Perennial Ice/Snow # NOQA
                'D96': round(aoi_nlcd.get(21, 0), 2),  # Developed, Open Space # NOQA
                'D97': round(aoi_nlcd.get(22, 0), 2),  # Developed, Low Intensity # NOQA
                'D98': round(aoi_nlcd.get(23, 0), 2),  # Developed, Medium Intensity # NOQA
                'D99': round(aoi_nlcd.get(24, 0), 2),  # Developed, High Intensity # NOQA
                'D100': round(aoi_nlcd.get(31, 0), 2),  # Barren Land (Rock/Sand/Clay) # NOQA
                'D101': round(aoi_nlcd.get(41, 0), 2),  # Deciduous Forest # NOQA
                'D102': round(aoi_nlcd.get(42, 0), 2),  # Evergreen Forest # NOQA
                'D103': round(aoi_nlcd.get(43, 0), 2),  # Mixed Forest # NOQA
                'D104': round(aoi_nlcd.get(52, 0), 2),  # Shrub/Scrub # NOQA
                'D105': round(aoi_nlcd.get(71, 0), 2),  # Grassland/Herbaceous # NOQA
                'D106': round(aoi_nlcd.get(81, 0), 2),  # Pasture/Hay # NOQA
                'D107': round(aoi_nlcd.get(82, 0), 2),  # Cultivated Crops # NOQA
                'D108': round(aoi_nlcd.get(90, 0), 2),  # Woody Wetlands # NOQA
                'D109': round(aoi_nlcd.get(95, 0), 2),  # Emergent Herbaceous Wetlands # NOQA
            })

        payload.append({
            'name': k,
            'geojson': json.loads(v['geojson']),
            'worksheet': {
                'MMW Output': spec
            }
        })

    return payload
