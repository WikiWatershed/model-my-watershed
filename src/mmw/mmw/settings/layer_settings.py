"""
Config for boundary (a.k.a AoI) layers, basemaps, overlays,
and any other layer types.

For layers served from our tiler server, the settings must be kept in sync
with src/tiler/server.js.  In the dictionary below, the keys are the table ids.
If `json_field` is provided that column will be used for feature lookups,
but default to 'geom' if not.

For basemaps, maxZoom must be defined.
"""

LAYERS = [
    {
        'code': 'huc8',
        'display': 'USGS Subbasin unit (HUC-8)',
        'short_display': 'Subbasin',
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
    },
    {
        'code': 'huc10',
        'display': 'USGS Watershed unit (HUC-10)',
        'short_display': 'Watershed',
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
    },
    {
        'code': 'huc12',
        'display': 'USGS Subwatershed unit (HUC-12)',
        'short_display': 'Subwatershed',
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
    },
    {
        'code': 'school',
        'display': 'School Districts',
        'short_display': 'School Districts',
        'table_name': 'boundary_school_district',
        'helptext': 'U.S. school district boundaries.',
        'boundary': True,
        'vector': True,
    },
    {
        'display': 'National Land Cover Database',
        'short_display': 'NLCD',
        'helptext': 'National Land Cover Database defines'
                    'land use across the U.S.',
        'url': 'https://s3.amazonaws.com/com.azavea.datahub.tms/'
               'nlcd/{z}/{x}/{y}.png',
        'raster': True,
        'maxNativeZoom': 13,
        'maxZoom': 18,
        'opacity': 0.618,
        'has_opacity_slider': True
    },
    {
        'code': 'stream-low',
        'display': 'Low-Res',
        'table_name': 'deldem4net100r',
        'stream': True,
    },
    {
        'code': 'stream-medium',
        'display': 'Medium-Res',
        'table_name': 'deldem4net50r',
        'stream': True,
    },
    {
        'code': 'stream-high',
        'display': 'High-Res',
        'table_name': 'deldem4net20r',
        'stream': True,
    },
    {
        'type': 'mapbox',
        'display': 'Streets',
        'url': 'https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9'
               '/{z}/{x}/{y}.png',
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
    }
]
