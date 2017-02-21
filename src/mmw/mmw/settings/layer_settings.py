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
from collections import OrderedDict
import json

from django.contrib.gis.geos import GEOSGeometry
from tr55_settings import NLCD_MAPPING, SOIL_MAPPING

# Full perimeter of the Delaware River Basin (DRB).
drb_perimeter_path = join(dirname(abspath(__file__)), 'data/drb_perimeter.json')
drb_perimeter_file = open(drb_perimeter_path)
drb_perimeter = json.load(drb_perimeter_file)

# Buffered (3 mi) and simplified perimeter of the Delaware River Basin (DRB).
drb_simple_perimeter_path = join(dirname(abspath(__file__)),
                                 'data/drb_simple_perimeter.json')
drb_simple_perimeter_file = open(drb_simple_perimeter_path)
drb_simple_perimeter = json.load(drb_simple_perimeter_file)

# Simplified perimeter of PA, used for DEP specific layers
pa_perimeter_path = join(dirname(abspath(__file__)), 'data/pa_perimeter.json')
pa_perimeter_file = open(pa_perimeter_path)
pa_perimeter = json.load(pa_perimeter_file)

# Buffered with QGIS [buffer distance = 0.10] and simplified [factor=0.01]
# perimeter of the NHD Mid Atlantic Region (02)
# Not a visible layer, but used for to detect if a point will work for RWD.
nhd_region2_simple_perimeter_path = join(dirname(abspath(__file__)),
                                         'data/nhd_region2_simple_perimeter.json')
nhd_region2_simple_perimeter_file = open(nhd_region2_simple_perimeter_path)

NHD_REGION2_PERIMETER = json.load(nhd_region2_simple_perimeter_file)

LAYER_GROUPS = {
    'basemap': [
        {
            'display': 'Streets',
            'url': 'https://{s}.tiles.mapbox.com/v4/stroudcenter.1f06e119'
                    '/{z}/{x}/{y}.png?access_token=pk.eyJ1Ijoic3Ryb3VkY2VudGVyIiwiYSI6ImNpd2NhMmZiMDA1enUyb2xrdjlhYzV6N24ifQ.3dFii4MfQFOqYEDg9kVguA',  # NOQA
            'attribution': 'Map data &copy; <a href="http://openstreetmap.org">'
                           'OpenStreetMap</a> contributors, '
                           '<a href="http://creativecommons.org/licenses/by-sa/'
                           '2.0/">CC-BY-SA</a>, Imagery &copy; '
                           '<a href="http://mapbox.com">Mapbox</a>',
            'maxZoom': 18,
            'default': True,
        },
        {
            'display': 'Satellite',
            'url': 'https://server.arcgisonline.com/arcgis/rest/services/'
                   'World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'attribution': 'Map data from <a href="http://www.arcgis.com/home/'
                           'item.html?id=10df2279f9684e4a9f6a7f08febac2a9">ESRI'
                           '</a>',
            'maxZoom': 19,
        },
        {
            'display': 'Satellite with Roads',
            'googleType': 'HYBRID',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
            'maxZoom': 18,  # Max zoom changes based on location. Safe default
        },
        {
            'display': 'Terrain',
            'googleType': 'TERRAIN',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
            'maxZoom': 20,
        },
    ],
    'coverage': [
        {
            'display': 'National Land Cover Database',
            'css_class_prefix': 'nlcd',
            'short_display': 'NLCD',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S.',
            'url': 'https://{s}.tiles.azavea.com/nlcd/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD_MAPPING.iteritems()},
        },
        {
            'display': 'Hydrologic Soil Groups From gSSURGO',
            'short_display': 'SSURGO',
            'css_class_prefix': 'soil',
            'helptext': 'Soils are classified by the Natural Resource Conservation '
                        'Service into four Hydrologic Soil Groups based on the '
                        'soil\'s runoff potential. The four Hydrologic Soils Groups'
                        'are A, B, C and D. Where A\'s generally have the smallest '
                        'runoff potential and D\'s the greatest.',
            'url': 'https://{s}.tiles.azavea.com/ssurgo-hydro-group-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': OrderedDict([
                SOIL_MAPPING[1],
                SOIL_MAPPING[2],
                SOIL_MAPPING[3],
                SOIL_MAPPING[5],
                SOIL_MAPPING[6],
                SOIL_MAPPING[7],
                SOIL_MAPPING[4],
            ]),
        },
        {
            'code': 'urban_areas',
            'table_name': 'dep_urban_areas',
            'display': 'PA Urbanized Areas',
            'short_display': 'PA Urbanized Areas',
            'minZoom': 7,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'perimeter': pa_perimeter,
        },
        {
            'code': 'drb_catchment_water_quality_tn',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TN Loading Rates from SRAT Catchments'),
            'table_name': 'drb_catchment_water_quality_tn',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 5 kg/y',
                2: 'Less than 10 kg/y',
                3: 'Less than 15 kg/y',
                4: 'Less than 20 kg/y',
                5: 'Greater than 20 kg/y',
            }
        },
        {
            'code': 'drb_catchment_water_quality_tp',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TP Loading Rates from SRAT Catchments'),
            'table_name': 'drb_catchment_water_quality_tp',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 0.30 kg/y',
                2: 'Less than 0.60 kg/y',
                3: 'Less than 0.90 kg/y',
                4: 'Less than 1.20 kg/y',
                5: 'Greater than 1.20 kg/y',
            }
        },
        {
            'code': 'drb_catchment_water_quality_tss',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TSS Loading Rates from SRAT Catchments'),
            'table_name': 'drb_catchment_water_quality_tss',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 250 kg/y',
                2: 'Less than 500 kg/y',
                3: 'Less than 750 kg/y',
                4: 'Less than 1000 kg/y',
                5: 'Greater than 1000 kg/y',
            }
        }
    ],
    'boundary': [
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
            'minZoom': 7,
            'selectable': True,
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
            'minZoom': 8,
            'selectable': True,
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
            'minZoom': 9,
            'selectable': True,
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
            'minZoom': 9,
            'selectable': True,
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
            'minZoom': 6,
            'selectable': True,
        },
        {
            'code': 'school',
            'display': 'School Districts',
            'short_display': 'School Districts',
            'table_name': 'boundary_school_district',
            'helptext': 'U.S. school district boundaries.',
            'minZoom': 9,
            'selectable': True,
        },
        {
            'code': 'municipalities',
            'table_name': 'dep_municipalities',
            'display': 'PA Municipalities',
            'short_display': 'PA Municipalities',
            'minZoom': 7,
            'perimeter': pa_perimeter,
        },
    ],
    'stream': [
        {
            'code': 'nhd_streams_v2',
            'display': ('Continental US Medium Resolution' +
                        ' Stream Network'),
            'table_name': 'nhdflowline',
            'minZoom': 3
        },
        {
            'code': 'drb_streams_v2',
            'display': ('Delaware River Basin High Resolution' +
                        ' Stream Network'),
            'table_name': 'drb_streams_50',
            'minZoom': 5,
            'perimeter': drb_simple_perimeter  # Layer is only selectable when viewport
            # overlaps with perimeter polygon.
        },
        {
            'code': 'nhd_quality_tn',
            'display': ('Delaware River Basin TN Concentration' +
                        ' From SRAT'),
            'table_name': 'nhd_quality_tn',
            'minZoom': 3,
            'css_class_prefix': 'stream',
            # Defined in tiler/server.js
            'legend_mapping': {
                1: 'Less than 1 kg/y',
                2: 'Less than 2 kg/y',
                3: 'Less than 3 kg/y',
                4: 'Less than 4 kg/y',
                'NA': 'No Data'
            }
        },
        {
            'code': 'nhd_quality_tp',
            'display': ('Delaware River Basin TP Concentration' +
                        ' From SRAT'),
            'table_name': 'nhd_quality_tp',
            'minZoom': 3,
            'css_class_prefix': 'stream',
            # Defined in tiler/server.js
            'legend_mapping': {
                1: 'Less than 0.03 kg/y',
                2: 'Less than 0.06 kg/y',
                3: 'Less than 0.09 kg/y',
                4: 'Less than 0.12 kg/y',
                'NA': 'No Data'
            }
        },
        {
            'code': 'nhd_quality_tss',
            'display': ('Delaware River Basin TSS Concentration' +
                        ' From SRAT'),
            'table_name': 'nhd_quality_tss',
            'minZoom': 3,
            'css_class_prefix': 'stream',
            # Defined in tiler/server.js
            'legend_mapping': {
                1: 'Less than 50 kg/y',
                2: 'Less than 100 kg/y',
                3: 'Less than 150 kg/y',
                4: 'Less than 200 kg/y',
                'NA': 'No Data'
            }
        },
    ],
}


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

# To hide elements from the UI
VIZER_IGNORE = [
    'CRBCZO',
    'SWRC',
    'USCRN'
]

# To give friendly names in the UI
VIZER_NAMES = {
    'DEOS': 'Delaware Environmental Observing System',
    'NOS/CO-OPS': 'NOAA Tides and Currents',
    'USGS': 'USGS National Water Information System'
}
