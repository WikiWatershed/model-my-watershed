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
from mmw.settings.layer_classmaps import NLCD, SOIL, PROTECTED_LANDS, IO_LULC

# [01, 02, ...] style list for layer time sliders
MONTH_CODES = [str(m).zfill(2) for m in range(1, 13)]

# Full perimeter of the Delaware River Basin (DRB).
drb_perimeter_path = join(dirname(abspath(__file__)), 'data/drb_perimeter.json')
with open(drb_perimeter_path) as drb_perimeter_file:
    drb_perimeter = json.load(drb_perimeter_file)

# Buffered (3 mi) and simplified perimeter of the Delaware River Basin (DRB).
drb_simple_perimeter_path = join(dirname(abspath(__file__)),
                                 'data/drb_simple_perimeter.json')
with open(drb_simple_perimeter_path) as drb_simple_perimeter_file:
    drb_simple_perimeter = json.load(drb_simple_perimeter_file)

# Simplified perimeter of PA, used for DEP specific layers
pa_perimeter_path = join(dirname(abspath(__file__)), 'data/pa_perimeter.json')
with open(pa_perimeter_path) as pa_perimeter_file:
    pa_perimeter = json.load(pa_perimeter_file)

# Simplified perimeter of the continental US, used to prevent non-CONUS
# AoIs from being sent to the API
conus_perimeter_path = join(dirname(abspath(__file__)), 'data/conus_perimeter.json')
with open(conus_perimeter_path) as conus_perimeter_file:
    CONUS_PERIMETER = json.load(conus_perimeter_file)

# Buffered with QGIS [buffer distance = 0.10] and simplified [factor=0.01]
# perimeter of the NHD Mid Atlantic Region (02)
# Not a visible layer, but used for to detect if a point will work for RWD.
nhd_region2_simple_perimeter_path = join(dirname(abspath(__file__)),
                                         'data/nhd_region2_simple_perimeter.json')
with open(nhd_region2_simple_perimeter_path) as nhd_region2_simple_perimeter_file:
    NHD_REGION2_PERIMETER = json.load(nhd_region2_simple_perimeter_file)

# Buffered (3 mi) and simplified perimeter of the
# Delaware River Watershed Initiative (DRWI)
drwi_simple_perimeter_path = join(dirname(abspath(__file__)),
                                  'data/drwi_simple_perimeter.json')
with open(drwi_simple_perimeter_path) as drwi_simple_perimeter_file:
    DRWI_SIMPLE_PERIMETER_JSON = json.load(drwi_simple_perimeter_file)

LAYER_GROUPS = {
    'basemap': [
        {
            'display': 'Topography',
            'url': 'https://server.arcgisonline.com/arcgis/rest/services/'
                   'World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
            'attribution': 'Map data from <a href="http://www.arcgis.com/home/'
                           'item.html?id=30e5fe3149c34df1ba922e6f5bbf808f" '
                           'target="_blank">ESRI</a>',
            'default': True,
            'maxZoom': 19,
            'big_cz': True,
        },
        {
            'display': 'Satellite',
            'url': 'https://server.arcgisonline.com/arcgis/rest/services/'
                   'World_Imagery/MapServer/tile/{z}/{y}/{x}',
            'attribution': 'Map data from <a href="http://www.arcgis.com/home/'
                           'item.html?id=10df2279f9684e4a9f6a7f08febac2a9" '
                           'target="_blank">ESRI</a>',
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
            'display': 'IO Global LULC 2023',
            'code': 'io-lulc-2023',
            'css_class_prefix': 'io-lulc-2023 io-lulc',
            'short_display': 'IO LULC 2023',
            'helptext': 'Global land use/land cover dataset produced by '
                        'Impact Observatory, Microsoft, and Esri, derived from '
                        'ESA Sentinel-2 imagery at 10 meter resolution.',
            'url': 'https://{s}.tiles.azavea.com/io-lulc-2023-10m/{z}/{x}/{y}/0695d32d7723e4c3b53f1ec897e108282dd8ae2c919250f333f4600fe78ebbed.png',
            'maxNativeZoom': 8,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in IO_LULC.items() },
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2019 (NLCD19)',
            'code': 'nlcd-2019_2019',
            'css_class_prefix': 'nlcd-2019-30m nlcd',
            'short_display': 'NLCD 2019',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From 2019 of NLCD19.',
            'url': 'https://{s}.tiles.azavea.com/nlcd-2019-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2016 (NLCD19)',
            'code': 'nlcd-2019_2016',
            'css_class_prefix': 'nlcd-2016-30m nlcd',
            'short_display': 'NLCD 2016',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From 2016 of NLCD19.',
            'url': 'https://{s}.tiles.azavea.com/nlcd-2016-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2011 (NLCD19)',
            'code': 'nlcd-2019_2011',
            'css_class_prefix': 'nlcd-2011-30m nlcd',
            'short_display': 'NLCD 2011',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From 2011 of NLCD19.',
            'url': 'https://{s}.tiles.azavea.com/nlcd-2011-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2006 (NLCD19)',
            'code': 'nlcd-2019_2006',
            'css_class_prefix': 'nlcd-2006-30m nlcd',
            'short_display': 'NLCD 2006',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From 2006 of NLCD19.',
            'url': 'https://{s}.tiles.azavea.com/nlcd-2006-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2001 (NLCD19)',
            'code': 'nlcd-2019_2001',
            'css_class_prefix': 'nlcd-2001-30m nlcd',
            'short_display': 'NLCD 2001',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From 2001 of NLCD19.',
            'url': 'https://{s}.tiles.azavea.com/nlcd-2001-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
            'big_cz': True,
        },
        {
            'display': 'Land Use/Cover 2011 (NLCD11)',
            'code': 'nlcd-2011_2011',
            'css_class_prefix': 'nlcd',
            'short_display': 'NLCD',
            'helptext': 'National Land Cover Database defines'
                        'land use across the U.S. From NLCD11.',
            'url': 'https://{s}.tiles.azavea.com/nlcd/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': { key: names[1] for key, names in NLCD.items()},
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
                SOIL[1],
                SOIL[2],
                SOIL[3],
                SOIL[5],
                SOIL[6],
                SOIL[7],
                SOIL[4],
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
            'legend_units_label': 'Air Temperature (\xb0C)',
            'legend_unit_breaks': [-20, '', -8, '', 4, '', 16, '', 28, '', 40],
            'big_cz': True,
        },
        {
            'code': 'protected-lands-30m',
            'display': 'Protected Lands',
            'short_display': 'Protected Lands',
            'css_class_prefix': 'protected-lands-30m',
            'help_text': '',
            'url': 'https://{s}.tiles.azavea.com/protected-lands-30m/{z}/{x}/{y}.png',
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.8,
            'has_opacity_slider': True,
            'legend_mapping': OrderedDict([
                (shortname, longname)
                for _, (shortname, longname) in sorted(
                        PROTECTED_LANDS.items(), key=lambda x: x[0]
                )
            ]),
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
            'display': 'DRB 2011 Urban Baseline',
            'code': 'urban-land-cover-2011-30m',
            'css_class_prefix': 'urban-land-cover-2011-30m',
            'short_display': '2011 Urban Land Cover',
            'url': 'https://{s}.tiles.azavea.com/urban-land-cover-2011-30m/{z}/{x}/{y}.png',  # NOQA
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'opacity': 0.618,
            'has_opacity_slider': True,
            'legend_mapping': {
                'nonurban': 'Non-urban area',
                'urban': 'Urban area',
            },
            'big_cz': False,
        },
        {
            'display': 'DRB 2100 Urban Centers FX',
            'code': 'shippensburg-2100-centers-30m',
            'css_class_prefix': 'shippensburg-2100',
            'short_display': '2100 Centers',
            'url': 'https://{s}.tiles.azavea.com/shippensburg-2100-centers-30m/{z}/{x}/{y}.png',  # NOQA
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
            'display': 'DRB 2100 Urban Corridors FX',
            'code': 'shippensburg-2100-corridors-30m',
            'css_class_prefix': 'shippensburg-2100',
            'short_display': '2100 Corridors',
            'url': 'https://{s}.tiles.azavea.com/shippensburg-2100-corridors-30m/{z}/{x}/{y}.png',  # NOQA
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
            'display': ('DRB TN Loading Rates from SRAT'),
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
            'display': ('DRB TP Loading Rates from SRAT'),
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
            'display': ('DRB TSS Loading Rates from SRAT'),
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
            'code': 'nhd_streams_hr_v1',
            'display': ('Continental US High Resolution' +
                        ' Stream Network'),
            'table_name': 'nhdflowlinehr',
            'minZoom': 8,
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
            'display': ('DRB TN conc. from SRAT'),
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
            'display': ('DRB TP conc. from SRAT'),
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
            'display': ('DRB TSS conc. from SRAT'),
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
        {
            'code': 'TDX_streamnet_7020038340_02',
            'display': 'TDX Streamnet 7020038340',
            'minZoom': 3,
            'maxNativeZoom': 12,
            'maxZoom': 18,
            'vectorType': True,
            'url': 'https://{s}.tiles.azavea.com/TDX_streamnet_7020038340_02/{z}/{x}/{y}.pbf',  # NOQA
        },
        {
            'code': 'TDX_streamnet_7020038340_03',
            'display': 'TDX Streamnet 7020038340 - Ordered',
            'minZoom': 0,
            'maxNativeZoom': 13,
            'maxZoom': 18,
            'vectorType': True,
            'url': 'https://{s}.tiles.azavea.com/TDX_streamnet_7020038340_01/{z}/{x}/{y}.pbf',  # NOQA
        },
        {
            'code': 'tdxhydro_streams_v1',
            'display': ('TDX Hydro'),
            'table_name': 'tdxhydro',
            'minZoom': 5,
        },
    ],
}


# List of valid stream tables
STREAM_TABLES = {
    'nhd': 'nhdflowline',
    'nhdhr': 'nhdflowlinehr',
    'drb': 'drb_streams_50',
}

DRB_PERIMETER = GEOSGeometry(json.dumps(drb_perimeter['geometry']), srid=4326)
DRB_SIMPLE_PERIMETER = \
    GEOSGeometry(json.dumps(drb_simple_perimeter['geometry']), srid=4326)
DRWI_SIMPLE_PERIMETER = \
    GEOSGeometry(json.dumps(DRWI_SIMPLE_PERIMETER_JSON['geometry']), srid=4326)

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
