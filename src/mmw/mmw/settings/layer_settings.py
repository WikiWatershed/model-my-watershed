"""
Config for boundary (a.k.a AoI) layers, basemaps, overlays,
and any other layer types.

For layers served from our tiler server, the settings must be kept in sync
with src/tiler/server.js.  In the dictionary below, the keys are the table ids.
If `json_field` is provided that column will be used for feature lookups,
but default to 'geom' if not.

For basemaps, maxZoom must be defined.
"""

from os.path import join, dirname, abspath
import json

from django.contrib.gis.geos import GEOSGeometry


# Simplified perimeter of the Delaware River Basin (DRB).
drb_perimeter_path = join(dirname(abspath(__file__)), 'data/drb_perimeter.json')
drb_perimeter_file = open(drb_perimeter_path)
drb_perimeter = json.load(drb_perimeter_file)

# Simplified perimeter of PA, used for DEP specific layers
pa_perimeter_path = join(dirname(abspath(__file__)), 'data/pa_perimeter.json')
pa_perimeter_file = open(pa_perimeter_path)
pa_perimeter = json.load(pa_perimeter_file)

LAYERS = [
    {
        'code': 'huc8',
        'display': 'USGS Subbasin unit (HUC-8)',
        'short_display': 'HUC-8 Subbasin',
        'table_name': 'boundary_huc08',
        'helptext': 'HUC stands for hydrologic unit code. The hydrologic '
                    'unit hierarchy is indicated by the number of digits in '
                    'groups of two (such as HUC-2, HUC-4, and HUC-6) within '
                    'the HUC code. HUC 8 maps the subbasin level, analogous '
                    'to medium-sized river basins. There are about 2200 '
                    'nationwide. This tool allows you to pick a predefined '
                    'HUC-8 to analyze.',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 7,
    },
    {
        'code': 'huc10',
        'display': 'USGS Watershed unit (HUC-10)',
        'short_display': 'HUC-10 Watershed',
        'table_name': 'boundary_huc10',
        'helptext': 'HUC stands for hydrologic unit code. The hydrologic '
                    'unit hierarchy is indicated by the number of digits in '
                    'groups of two (such as HUC-2, HUC-4, and HUC-6) within '
                    'the HUC code. HUC-10 maps the watershed level, typically '
                    'from (160-1010 square km) . There are about 22,000 '
                    'nationwide. This tool allows you to pick a predefined '
                    'HUC-10 to analyze.',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 8,
    },
    {
        'code': 'huc12',
        'display': 'USGS Subwatershed unit (HUC-12)',
        'short_display': 'HUC-12 Subwatershed',
        'table_name': 'boundary_huc12',
        'json_field': 'geom_detailed',
        'helptext': 'HUC stands for hydrologic unit code. The hydrologic '
                    'unit hierarchy is indicated by the number of digits in '
                    'groups of two (such as HUC-2, HUC-4, and HUC-6) within '
                    'the HUC code. HUC-12 is a more local sub-watershed level '
                    'that captures tributary systems. There are about 90,000 '
                    'nationwide. This tool allows you to pick a predefined '
                    'HUC-12 to analyze.',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 9,
    },
    {
        'code': 'county',
        'display': 'County Lines',
        'short_display': 'County',
        'table_name': 'boundary_county',
        'helptext': 'Counties in U.S. states are administrative divisions '
                    'of the state in which their boundaries are drawn. 3,144 '
                    'counties and county equivalents carve up the United '
                    'States, ranging in quantity from 3 for Delaware to 254 '
                    'for Texas. Where they exist, they are the intermediate '
                    'tier of state government, between the statewide tier '
                    'and the immediately local government tier',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 9,
    },
    {
        'code': 'district',
        'display': 'Congressional Districts',
        'short_display': 'Congressional District',
        'table_name': 'boundary_district',
        'helptext': 'There are 435 congressional districts in the United '
                    'States House of Representatives, with each one '
                    'representing approximately 700,000 people. In addition '
                    'to the 435 congressional districts, the five inhabited '
                    'U.S. territories and the federal district of Washington, '
                    'D.C. This tool will allow you to select the boundary of '
                    'a congressional district on which to perform water '
                    'quality analysis.',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 6,
    },
    {
        'code': 'school',
        'display': 'School Districts',
        'short_display': 'School Districts',
        'table_name': 'boundary_school_district',
        'helptext': 'U.S. school district boundaries.',
        'boundary': True,
        'vector': True,
        'overlay': True,
        'minZoom': 9,
    },
    {
        'code': 'stream',
        'display': 'National Stream Network',
        'table_name': 'nhdflowline',
        'stream': True,
        'overlay': True,
        'minZoom': 10
    },
    {
        'code': 'drb_streams',
        'display': 'DRB Stream Network',
        'table_name': 'drb_streams_50',
        'stream': True,
        'overlay': True,
        'minZoom': 11,
        'perimeter': drb_perimeter # Layer is only selectable when viewport
        # overlaps with perimeter polygon.
    },
    {
        'display': 'National Land Cover Database',
        'short_display': 'NLCD',
        'helptext': 'National Land Cover Database defines'
                    'land use across the U.S.',
        'url': 'https://{s}.tiles.azavea.com/nlcd/{z}/{x}/{y}.png',
        'raster': True,
        'overlay': True,
        'maxNativeZoom': 13,
        'maxZoom': 18,
        'opacity': 0.618,
        'has_opacity_slider': True
    },
    {
        'display': 'Hydrologic Soil Groups',
        'short_display': 'SSURGO',
        'helptext': 'Soils are classified by the Natural Resource Conservation '
                    'Service into four Hydrologic Soil Groups based on the '
                    'soil\'s runoff potential. The four Hydrologic Soils Groups'
                    'are A, B, C and D. Where A\'s generally have the smallest '
                    'runoff potential and D\'s the greatest.',
        'url': 'https://{s}.tiles.azavea.com/ssurgo-hydro-group-30m/{z}/{x}/{y}.png',
        'raster': True,
        'overlay': True,
        'maxNativeZoom': 13,
        'maxZoom': 18,
        'opacity': 0.618,
        'has_opacity_slider': True
    },
    {
        'type': 'mapbox',
        'display': 'Streets',
        'url': 'https://{s}.tiles.mapbox.com/v4/srgdamia1.d0197125'
                '/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic3JnZGFtaWExIiwiYSI6ImNpbnJ1bGd5ajEwbDB1YW0zcnE4bjZwaWwifQ.4kGj3EcIdDY4MyBmOEZsrA', #noqa
        'attribution': 'Map data &copy; <a href="http://openstreetmap.org">'
                       'OpenStreetMap</a> contributors, '
                       '<a href="http://creativecommons.org/licenses/by-sa/'
                       '2.0/">CC-BY-SA</a>, Imagery &copy; '
                       '<a href="http://mapbox.com">Mapbox</a>',
        'maxZoom': 18,
        'default': True,
        'basemap': True,
    },
    {
        'display': 'Satellite',
        'type': 'esri',
        'url': 'https://server.arcgisonline.com/arcgis/rest/services/'
               'World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'attribution': 'Map data from <a href="http://www.arcgis.com/home/'
                       'item.html?id=10df2279f9684e4a9f6a7f08febac2a9">ESRI'
                       '</a>',
        'maxZoom': 19,
        'basemap': True,
    },
    {
        'display': 'Satellite with Roads',
        'type': 'google',
        'googleType': 'HYBRID',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
        'maxZoom': 18,  # Max zoom changes based on location. Safe default
        'basemap': True,
    },
    {
        'display': 'Terrain',
        'type': 'google',
        'googleType': 'TERRAIN',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
        'maxZoom': 20,
        'basemap': True,
    },
    {
        'code': 'municipalities',
        'table_name': 'dep_municipalities',
        'display': 'PA Municipalities',
        'short_display': 'PA Municipalities',
        'vector': True,
        'overlay': True,
        'minZoom': 7,
        'perimeter': pa_perimeter,
    },
    {
        'code': 'urban_areas',
        'table_name': 'dep_urban_areas',
        'display': 'PA Urbanized Areas',
        'short_display': 'PA Urbanized Areas',
        'raster': True,
        'overlay': True,
        'minZoom': 7,
        'opacity': 0.618,
        'has_opacity_slider': True,
        'perimeter': pa_perimeter,
    }
]

DRB_PERIMETER = GEOSGeometry(json.dumps(drb_perimeter['geometry']), srid=4326)

# Vizer observation meta data URL.  Happens to be proxied through a local app
# server to avoid Cross Domain request errors
VIZER_ROOT = '/observation/services/get_asset_info.php?'
# For requests that should use a daily cached backed proxy
VIZER_CACHED_ROOT = '/cache' + VIZER_ROOT
VIZER_TYPE_PARAM = '&asset_type=siso'

VIZER_URLS = {
    'layers': VIZER_CACHED_ROOT + 'opt=meta' + VIZER_TYPE_PARAM,
    'variable': VIZER_ROOT + 'opt=data&asset_id={{asset_id}}&var_id={{var_id}}' + VIZER_TYPE_PARAM,  # NOQA
    'recent': VIZER_ROOT + 'opt=recent_values&asset_id={{asset_id}}&var_id=all' + VIZER_TYPE_PARAM  # NOQA
}
