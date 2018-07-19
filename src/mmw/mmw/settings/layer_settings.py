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

# [01, 02, ...] style list for layer time sliders
MONTH_CODES = [str(m).zfill(2) for m in range(1, 13)]

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

# Simplified perimeter of the continental US, used to prevent non-CONUS
# AoIs from being sent to the API
conus_perimeter_path = join(dirname(abspath(__file__)), 'data/conus_perimeter.json')
conus_perimeter_file = open(conus_perimeter_path)
CONUS_PERIMETER = json.load(conus_perimeter_file)

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
            'big_cz': True,
        },
        {
            'display': 'Satellite',
            'url': 'https://server.arcgisonline.com/arcgis/rest/services/'
                   'World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'attribution': 'Map data from <a href="http://www.arcgis.com/home/'
                           'item.html?id=10df2279f9684e4a9f6a7f08febac2a9">ESRI'
                           '</a>',
            'maxZoom': 19,
            'big_cz': True,
        },
        {
            'display': 'Satellite with Roads',
            'googleType': 'HYBRID',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
            'maxZoom': 18,  # Max zoom changes based on location. Safe default
            'big_cz': True,
        },
        {
            'display': 'Terrain',
            'googleType': 'TERRAIN',  # SATELLITE, ROADMAP, HYBRID, or TERRAIN
            'maxZoom': 20,
            'big_cz': True,
        },
    ],
    'coverage': [
        {
            'display': 'National Land Cover Database',
            'code': 'nlcd',
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
            'big_cz': True,
        },
        {
            'display': 'Hydrologic Soil Groups From gSSURGO',
            'code': 'soil',
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
            'big_cz': True,
        },
        {
            'display': 'Elevation',
            'code': 'elevation',
            'css_class_prefix': 'elevation',
            'short_display': 'Elevation',
            'helptext': '',
            'url': 'https://{s}.tiles.azavea.com/ned-nhdplus-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.710,
            'has_opacity_slider': True,
            'use_color_ramp': True,
            'color_ramp_id': 'elevation-legend',
            'legend_units_label': 'Elevation (m)',
            'legend_unit_breaks': [-86, 0, 20, 100, 250, 750, 2000, 4413],
        },
        {
            'display': 'Slope (Percent)',
            'code': 'pct_slope',
            'css_class_prefix': 'pct_slope',
            'short_display': 'Slope (Percent)',
            'helptext': '',
            'url': 'https://{s}.tiles.azavea.com/us-percent-slope-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'use_color_ramp': True,
            'color_ramp_id': 'percent-slope-legend',
            'legend_units_label': 'Slope (%)',
            'legend_unit_breaks': [0, 1, 2, 4, 6, 10, 15, 20, 30, 50, 951],
        },
        {
            'code': 'mean_ppt',
            'display': 'Mean Monthly Precipitation',
            'short_display': 'Mean Precip',
            'helptext': 'PRISM monthly mean precipitation.',
            'url': 'https://{s}.tiles.azavea.com/climate/ppt_{month}/{z}/{x}/{y}.png',  # noqa
            'maxNativeZoom': 10,
            'maxZoom': 18,
            'opacity': 0.85,
            'has_opacity_slider': True,
            'time_slider_values': MONTH_CODES,
            'use_color_ramp': True,
            'color_ramp_id': 'precipitation-legend',
            'legend_units_label': 'Precipitation (mm/month)',
            'legend_unit_breaks': [0, '', 100, '', 200, '', 300, '', 400, '', 500],
            'big_cz': True,
        },
        {
            'code': 'mean_temp',
            'display': 'Mean Monthly Temperature',
            'short_display': 'Mean Temp',
            'helptext': 'PRISM monthly mean temperature.',
            'url': 'https://{s}.tiles.azavea.com/climate/tmean_{month}/{z}/{x}/{y}.png',  # noqa
            'maxNativeZoom': 10,
            'maxZoom': 18,
            'opacity': 0.85,
            'has_opacity_slider': True,
            'time_slider_values': MONTH_CODES,
            'use_color_ramp': True,
            'color_ramp_id': 'temperature-legend',
            'legend_units_label': u'Air Temperature (\xb0C)',
            'legend_unit_breaks': [-20, '', -8, '', 4, '', 16, '', 28, '', 40],
            'big_cz': True,
        },
        {
            'display': 'Active River Area - NE & Mid-Atlantic',
            'code': 'ara-30m',
            'css_class_prefix': 'ara',
            'short_display': 'ARA',
            'helptext': '',
            'url': 'https://{s}.tiles.azavea.com/ara-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'big_cz': False,
        },
        {
            'code': 'urban_areas',
            'table_name': 'dep_urban_areas',
            'display': 'PA Urbanized Areas and Municipalities',
            'short_display': 'PA Urbanized Areas, Munis',
            'minZoom': 7,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'perimeter': pa_perimeter,
            'big_cz': False,
            'overlay_codes': ['municipalities'],
            'legend_mapping': {
                'pa-dep-area': 'Urbanized Area',
                'pa-dep-muni': 'Municipality Boundary',
            },
        },
        {
            'code': 'drb_catchment_water_quality_tn',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TN Loading Rates from SRAT Catchments'),
            'short_display': 'TN Loading Rates',
            'table_name': 'drb_catchment_water_quality_tn',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 5 kg/ha',
                2: 'Less than 10 kg/ha',
                3: 'Less than 15 kg/ha',
                4: 'Less than 20 kg/ha',
                5: 'Greater than 20 kg/ha',
            },
            'big_cz': False,
        },
        {
            'code': 'drb_catchment_water_quality_tp',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TP Loading Rates from SRAT Catchments'),
            'short_display': 'TP Loading Rates',
            'table_name': 'drb_catchment_water_quality_tp',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 0.30 kg/ha',
                2: 'Less than 0.60 kg/ha',
                3: 'Less than 0.90 kg/ha',
                4: 'Less than 1.20 kg/ha',
                5: 'Greater than 1.20 kg/ha',
            },
            'big_cz': False,
        },
        {
            'code': 'drb_catchment_water_quality_tss',
            'display': ('DRB Catchment Water Quality Data' +
                        ' ' + 'TSS Loading Rates from SRAT Catchments'),
            'short_display': 'TSS Loading Rates',
            'table_name': 'drb_catchment_water_quality_tss',
            'minZoom': 3,
            'perimeter': drb_simple_perimeter,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'css_class_prefix': 'catchment',
            # Defined in tiler/styles.mss
            'legend_mapping': {
                1: 'Less than 250 kg/ha',
                2: 'Less than 500 kg/ha',
                3: 'Less than 750 kg/ha',
                4: 'Less than 1000 kg/ha',
                5: 'Greater than 1000 kg/ha',
            },
            'big_cz': False,
        },
        {
            'display': 'Future Land Use 2050 Baseline',
            'code': 'shippensburg-2050-baseline-30m',
            'css_class_prefix': 'shippensburg-2050',
            'short_display': '2050 Baseline',
            'helptext': 'Shippensburg Future Land Use 2050 Baseline',
            'url': 'https://{s}.tiles.azavea.com/shippensburg-2050-baseline-30m/{z}/{x}/{y}.png',  # NOQA
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'use_color_ramp': True,
            'color_ramp_id': 'shippensburg-legend',
            'legend_units_label': 'Projected Urbanization (%)',
            'legend_unit_breaks': [0, '', 20, '', 40, '', 60, '', 80, '', 100],
            'big_cz': False,
        },
        {
            'display': 'Future Land Use 2050 Scenario 1',
            'code': 'shippensburg-2050-scenario1-30m',
            'css_class_prefix': 'shippensburg-2050',
            'short_display': '2050 Scenario 1',
            'helptext': 'Shippensburg Future Land Use 2050 Scenario 1',
            'url': 'https://{s}.tiles.azavea.com/shippensburg-2050-scenario1-30m/{z}/{x}/{y}.png',  # NOQA
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'use_color_ramp': True,
            'color_ramp_id': 'shippensburg-legend',
            'legend_units_label': 'Projected Urbanization (%)',
            'legend_unit_breaks': [0, '', 20, '', 40, '', 60, '', 80, '', 100],
            'big_cz': False,
        },
        {
            'display': 'Future Land Use 2050 Scenario 2',
            'code': 'shippensburg-2050-scenario2-30m',
            'css_class_prefix': 'shippensburg-2050',
            'short_display': '2050 Scenario 2',
            'helptext': 'Shippensburg Future Land Use 2050 Scenario 2',
            'url': 'https://{s}.tiles.azavea.com/shippensburg-2050-scenario2-30m/{z}/{x}/{y}.png',  # NOQA
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'use_color_ramp': True,
            'color_ramp_id': 'shippensburg-legend',
            'legend_units_label': 'Projected Urbanization (%)',
            'legend_unit_breaks': [0, '', 20, '', 40, '', 60, '', 80, '', 100],
            'big_cz': False,
        }
    ],
    'boundary': [
        {
            'code': 'huc8',
            'display': 'USGS Subbasin unit (HUC-8)',
            'short_display': 'HUC-8 Subbasin',
            'table_name': 'boundary_huc08',
            'helptext': 'US Geological Survey Hydrologic Units of the '
                        'eight-digit level (Hydrologic Unit Code 8), averaging'
                        ' 700 sq. mi. (1,813&nbsp;km<sup>2</sup>).<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 6,
            'selectable': True,
            'searchable': True,
            'search_rank': 30,
            'big_cz': True,
        },
        {
            'code': 'huc10',
            'display': 'USGS Watershed unit (HUC-10)',
            'short_display': 'HUC-10 Watershed',
            'table_name': 'boundary_huc10',
            'helptext': 'US Geological Survey Hydrologic Units of the '
                        'ten-digit level (Hydrologic Unit Code 10), averaging'
                        ' 227 sq. mi. (588&nbsp;km<sup>2</sup>).<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 8,
            'selectable': True,
            'searchable': True,
            'search_rank': 20,
            'big_cz': True,
        },
        {
            'code': 'huc12',
            'display': 'USGS Subwatershed unit (HUC-12)',
            'short_display': 'HUC-12 Subwatershed',
            'table_name': 'boundary_huc12',
            'json_field': 'geom_detailed',
            'helptext': 'US Geological Survey Hydrologic Units of the '
                        'twelve-digit level (Hydrologic Unit Code 12), '
                        'averaging 40 sq. mi. (104&nbsp;km<sup>2</sup>).<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 8,
            'selectable': True,
            'searchable': True,
            'search_rank': 10,
            'big_cz': True,
        },
        {
            'code': 'county',
            'display': 'County Lines',
            'short_display': 'County',
            'table_name': 'boundary_county',
            'helptext': 'County lines for each state in the continental '
                        'United States.<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 6,
            'selectable': True,
            'big_cz': True,
        },
        {
            'code': 'district',
            'display': 'Congressional Districts',
            'short_display': 'Congressional District',
            'table_name': 'boundary_district',
            'helptext': 'Congressional Districts for the United States House '
                        'of Representatives, for the 113th Congress: 1/3/2013'
                        '&ndash;1/3/2015.<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 5,
            'selectable': True,
            'big_cz': False,
        },
        {
            'code': 'school',
            'display': 'School Districts',
            'short_display': 'School Districts',
            'table_name': 'boundary_school_district',
            'helptext': 'Public School District boundaries in the '
                        'continental United States.<br />'
                        'See <a '
                        'href=\'https://wikiwatershed.org/documentation/mmw-tech/#overlay-boundary\' '
                        'target=\'_blank\' rel=\'noreferrer noopener\'>'
                        'our documentation on boundaries.'
                        '</a>',
            'minZoom': 8,
            'selectable': True,
            'big_cz': False,
        },
    ],
    'stream': [
        {
            'code': 'nhd_streams_v2',
            'display': ('Continental US Medium Resolution' +
                        ' Stream Network'),
            'table_name': 'nhdflowline',
            'minZoom': 3,
            'big_cz': True,
        },
        {
            'code': 'drb_streams_v2',
            'display': ('Delaware River Basin High Resolution' +
                        ' Stream Network'),
            'table_name': 'drb_streams_50',
            'minZoom': 5,
            # Layer selectable only when viewport overlaps perimeter polygon
            'perimeter': drb_simple_perimeter,
            'big_cz': False,
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
                1: 'Less than 1 mg/L',
                2: 'Less than 2 mg/L',
                3: 'Less than 3 mg/L',
                4: 'Less than 4 mg/L',
                'NA': 'No Data'
            },
            'big_cz': False,
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
                1: 'Less than 0.03 mg/L',
                2: 'Less than 0.06 mg/L',
                3: 'Less than 0.09 mg/L',
                4: 'Less than 0.12 mg/L',
                'NA': 'No Data'
            },
            'big_cz': False,
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
                1: 'Less than 50 mg/L',
                2: 'Less than 100 mg/L',
                3: 'Less than 150 mg/L',
                4: 'Less than 200 mg/L',
                'NA': 'No Data'
            },
            'big_cz': False,
        },
    ],
}


DRB_PERIMETER = GEOSGeometry(json.dumps(drb_perimeter['geometry']), srid=4326)
DRB_SIMPLE_PERIMETER = \
    GEOSGeometry(json.dumps(drb_simple_perimeter['geometry']), srid=4326)

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
