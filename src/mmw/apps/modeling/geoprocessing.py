# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import absolute_import

from django.conf import settings

import httplib
import json


NLCD_MAPPING = {
    11: ['water', 'Water'],
    21: ['urban_grass', 'Urban- or Tall-Grass'],
    22: ['li_residential', 'Low-Intensity Res.'],
    23: ['hi_residential', 'High-Intensity Res.'],
    24: ['industrial', 'Industrial &c.'],
    31: ['desert', 'Desert &c.'],
    41: ['deciduous_forest', 'Deciduous Forest'],
    42: ['evergreen_forest', 'Evergreen Forest'],
    43: ['mixed_forest', 'Mixed Forest'],
    52: ['chaparral', 'Chaparral'],
    71: ['grassland', 'Grassland'],
    81: ['pasture', 'Pasture &c.'],
    82: ['row_crop', 'Row Crop'],
    90: ['woody_wetland', 'Woody Wetland'],
    95: ['herbaceous_wetland', 'Herbaceous Wetland']
}

SOIL_MAPPING = {
    1: ['a', 'A'],
    2: ['b', 'B'],
    3: ['c', 'C'],
    4: ['d', 'D']
}


def geotrellis(polygon):
    """
    Send a string containing a GeoJSON Polygon, MultiPolygon, or
    GeometryCollection (containing only Polygons and Multipolygons) to
    Geotrellis and get back a histogram of NLCD x SOIL pairs present
    in that area.
    """
    host = settings.GEOP['host']
    conn = httplib.HTTPConnection(host)
    try:
        conn.request('POST', '', polygon, {'Content-type': 'application/json'})
        response = conn.getresponse()
        data = response.read()
        conn.close()
        return data
    except Exception:
        conn.close()
        return []


def geojson_to_x(data, nucleus, update_rule, after_rule):
    """
    Transform raw Geotrellis histogram output into an object of the
    desired form (dictated by the last three arguments).
    """
    retval = nucleus
    total = 0

    for [[nlcd, soil], count] in data:
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

    return geojson_to_x(data, nucleus, update_rule, after_rule)


def geojson_to_census(polygon):
    """
    Take a Polygon or MultiPolygon either as a string containing
    GeoJSON or as a Python object -- preferably the former -- and
    return a TR-55-compatible census.
    """
    if not isinstance(polygon, str) and not isinstance(polygon, unicode):
        polygon = json.dumps(polygon)
    data = json.loads(geotrellis(polygon))
    return data_to_census(data)


def geojson_to_censuses(polygons):
    """
    Similar to the `census` function above, but accepts a
    GeometryCollection of Polygons and/or MultiPolygons and returns a
    list of censuses.
    """
    if not isinstance(polygons, str)and not isinstance(polygons, unicode):
        polygons = json.dumps(polygons)
    data = json.loads(geotrellis(polygons))
    return [data_to_census(subdata) for subdata in data]


def geojson_to_survey(polygon):
    """
    Similar to the `census` function above, but produces a survey of
    the type expected by the `/analyze` page.
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

    if not isinstance(polygon, str) and not isinstance(polygon, unicode):
        polygon = json.dumps(polygon)
    data = json.loads(geotrellis(polygon))
    return geojson_to_x(data, nucleus, update_rule, after_rule)
