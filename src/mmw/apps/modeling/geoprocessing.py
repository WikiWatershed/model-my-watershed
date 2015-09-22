# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.conf import settings

import httplib
import json
import re


# Here, the keys of this dictionary are NLCD numbers (found in the
# rasters), and the values of the dictionary are arrays of length two.
# The first element of each array is the name of the NLCD category in
# the TR-55 code.  The second string is a short, human-readable name.
NLCD_MAPPING = {
    11: ['open_water', 'Open Water'],
    12: ['perennial_ice', 'Perennial Ice/Snow'],
    21: ['developed_open', 'Developed, Open Space'],
    22: ['developed_low', 'Developed, Low Intensity'],
    23: ['developed_med', 'Developed, Medium Intensity'],
    24: ['developed_high', 'Developed, High Intensity'],
    31: ['barren_land', 'Barren Land (Rock/Sand/Clay)'],
    41: ['deciduous_forest', 'Deciduous Forest'],
    42: ['evergreen_forest', 'Evergreen Forest'],
    43: ['mixed_forest', 'Mixed Forest'],
    52: ['shrub', 'Shrub/Scrub'],
    71: ['grassland', 'Grassland/Herbaceous'],
    81: ['pasture', 'Pasture/Hay'],
    82: ['cultivated_crops', 'Cultivated Crops'],
    90: ['woody_wetlands', 'Woody Wetlands'],
    95: ['herbaceous_wetlands', 'Emergent Herbaceous Wetlands']
}

# The soil rasters contain the numbers 1 through 4 (the keys of this
# dictionary).  The values of this dictionary are length-two arrays
# containing two strings.  The first member of each array is the name
# used for the corresponding soil-type in the TR-55 code.  The second
# member of each array is a human-readable description of that
# soil-type.
SOIL_MAPPING = {
    1: ['a', 'Sand'],
    2: ['b', 'Loam'],
    3: ['c', 'Sandy Clay'],
    4: ['d', 'Clay Loam']
}


def histogram(polygons):
    """
    Send a list of strings containing a GeoJSON Polygons and/or
    MultiPolygons to the datahub code, and get back a histogram of
    the NLCD x SOIL pairs present in that area.
    """
    def dict_to_array(d):
        result = []
        for k, v in d.iteritems():
            [k1, k2] = map(int, re.sub('[^0-9,]', '', k).split(','))
            result.append(((k1, k2), v))
        return result

    host = settings.GEOP['host']
    port = settings.GEOP['port']
    path = settings.GEOP['path']
    request = settings.GEOP['request'].copy()
    request['input']['geometry'] = polygons
    conn = httplib.HTTPConnection("%s:%s" % (host, port))

    try:
        conn.request('POST', path, json.dumps(request))
        data = json.loads(conn.getresponse().read())
        if data['status'] == 'OK':
            retval = [dict_to_array(d) for d in data['result']]
        else:
            retval = [[]]
    except Exception:
        retval = [[]]
    finally:
        conn.close()

    return retval


def histogram_to_x(data, nucleus, update_rule, after_rule):
    """
    Transform a raw Geotrellis histogram into an object of the desired
    form (dictated by the last three arguments).
    """
    retval = nucleus
    total = 0

    for ((nlcd, soil), count) in data:
        total += count
        update_rule(nlcd, soil, count, retval)

    after_rule(total, retval)

    return retval


def data_to_census(data):
    """
    Turn raw data from Geotrellis into a census.
    """
    def update_rule(nlcd, soil, count, census):
        dist = census['distribution']
        if nlcd in NLCD_MAPPING and soil in SOIL_MAPPING:
            nlcd_str = NLCD_MAPPING[nlcd][0]
            soil_str = SOIL_MAPPING[soil][0]
            key_str = '%s:%s' % (soil_str, nlcd_str)
            dist[key_str] = {'cell_count': count}

    def after_rule(count, census):
        census['cell_count'] = count

    nucleus = {'distribution': {}}

    return histogram_to_x(data, nucleus, update_rule, after_rule)


def json_polygon(polygon):
    """
    Utility function whose output is a GeoJSON polygon in a string.
    """
    if not isinstance(polygon, (str, unicode)):
        return json.dumps(polygon)
    else:
        return polygon


def geojson_to_census(polygon):
    """
    Take a Polygon or MultiPolygon either as a string containing
    GeoJSON or as a Python object -- preferably the former -- and
    return a TR-55-compatible census.
    """
    data = histogram([json_polygon(polygon)])[0]  # one-and-only-one AOI
    return data_to_census(data)


def geojson_to_censuses(polygons):
    """
    Similar to the `geojson_to_census` function above, but accepts an
    list of polygons and returns a list of censuses.
    """
    data = histogram([json_polygon(p) for p in polygons])
    return [data_to_census(subdata) for subdata in data]


def data_to_survey(data):
    """
    Turn raw data from Geotrellis into a survey.
    """
    def update_category(string, count, categories):
        if string in categories:
            entry = categories[string]
            entry['area'] += count
        else:
            categories[string] = {
                'type': string,
                'area': count,
                'coverage': None
            }

    def update_pcts(entry, count):
        area = entry['area']
        entry['coverage'] = float(area) / count
        return entry

    def update_rule(nlcd, soil, count, survey):
        landCategories = survey[0]['categories']
        soilCategories = survey[1]['categories']

        if nlcd in NLCD_MAPPING:
            update_category(NLCD_MAPPING[nlcd][1], count, landCategories)
        else:
            update_category('?', count, landCategories)

        if soil in SOIL_MAPPING:
            update_category(SOIL_MAPPING[soil][1], count, soilCategories)
        else:
            update_category('?', count, soilCategories)

    def after_rule(count, survey):
        nlcd_names = [v[1] for v in NLCD_MAPPING.values()]
        used_nlcd_names = [k for k in survey[0]['categories'].keys()]

        for i in nlcd_names:
            if (i not in used_nlcd_names):
                survey[0]['categories'][i] = {
                    'type': i,
                    'coverage': None,
                    'area': 0
                }

        land = survey[0]['categories'].iteritems()
        soil = survey[1]['categories'].iteritems()

        survey[0]['categories'] = [update_pcts(v, count) for k, v in land]
        survey[1]['categories'] = [update_pcts(v, count) for k, v in soil]

    nucleus = [
        {
            'name': 'land',
            'displayName': 'Land',
            'categories': {}
        },
        {
            'name': 'soil',
            'displayName': 'Soil',
            'categories': {}
        }
    ]

    return histogram_to_x(data, nucleus, update_rule, after_rule)


def geojson_to_survey(polygon):
    """
    Similar to the `census` function above, but produces a survey of
    the type expected by the `/analyze` page.
    """

    data = histogram([json_polygon(polygon)])[0]  # one-and-only-one AOI
    return data_to_survey(data)
