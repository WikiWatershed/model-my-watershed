# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from rest_framework.exceptions import ValidationError


def validate_aoi(aoi):
    if not check_analyze_aoi_size_below_max_area(aoi):
        error = create_excessive_aoi_size_error_msg(aoi)
        raise ValidationError(error)

    if not check_aoi_does_not_self_intersect(aoi):
        error = create_invalid_shape_error_msg(aoi)
        raise ValidationError(error)

    if not check_shape_in_conus(aoi):
        error = create_shape_exceeds_conus_error_msg(aoi)
        raise ValidationError(error)

    pass


def get_aoi_sq_km(aoi):
    geom = aoi.transform(5070, clone=True)
    return geom.area / 1000000


def create_excessive_aoi_size_error_msg(aoi):
    return ('Area of interest is too exceeds maximum size: submitted {} sq km '
            'but the maximum size is {}'.format(get_aoi_sq_km(aoi),
                                                settings.MMW_MAX_AREA))


def check_analyze_aoi_size_below_max_area(aoi):
    return get_aoi_sq_km(aoi) < settings.MMW_MAX_AREA


def create_invalid_shape_error_msg(aoi):
    return ('Area of interest is invalid: {}'.format(
            aoi.valid_reason))


def check_aoi_does_not_self_intersect(aoi):
    return aoi.valid


def create_shape_exceeds_conus_error_msg(aoi):
    return ('Area of interest boundaries must be within the boundaries of the '
            'continental United States')


def check_shape_in_conus(aoi):
    conus_boundaries = GEOSGeometry(
        json.dumps(settings.CONUS_PERIMETER['geometry']), 4326)
    return conus_boundaries.contains(aoi)
