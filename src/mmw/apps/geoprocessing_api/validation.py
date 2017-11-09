# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from numbers import Number

from django.conf import settings
from django.contrib.gis.geos import GEOSGeometry
from rest_framework.exceptions import ValidationError


def validate_rwd(location, data_source, snapping, simplify):
    if not check_location_format(location):
        error = create_invalid_rwd_location_format_error_msg(location)
        raise ValidationError(error)

    if not check_rwd_data_source(data_source):
        error = create_invalid_rwd_data_source_error_msg(data_source)
        raise ValidationError(error)

    if type(snapping) is not bool:
        error = create_invalid_rwd_snapping_error_msg(snapping)
        raise ValidationError(error)

    if not check_rwd_simplify_param_type(simplify):
        error = create_invalid_rwd_simplify_param_type_error_msg(simplify)
        raise ValidationError(error)

    pass


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


def create_invalid_rwd_location_format_error_msg(loc):
    return ('Invalid required `location` parameter value `{}`. Must be a '
            '`[lat, lng] where `lat` and `lng` are numeric.'.format(loc))


def check_location_format(loc):
    if loc is None or type(loc) is not list or len(loc) is not 2:
        return False
    else:
        [lat, lng] = loc
        return (isinstance(lat, Number) and isinstance(lng, Number) and
                type(lat) is not bool and type(lng) is not bool)


def create_invalid_rwd_data_source_error_msg(source):
    return ('Invalid optional `dataSource` parameter value `{}`. Must be '
            '`drb` or `nhd`.'.format(source))


def check_rwd_data_source(source):
    return source in ['drb', 'nhd']


def create_invalid_rwd_snapping_error_msg(snapping):
    return ('Invalid optional `snappingOn` parameter value `{}`. Must be '
            '`true` or `false`.'.format(snapping))


def create_invalid_rwd_simplify_param_type_error_msg(simplify):
    return ('Invalid optional `simplify` parameter value: `{}`. Must be a '
            'number.'.format(simplify))


def check_rwd_simplify_param_type(simplify):
    return isinstance(simplify, Number) or simplify is False


def get_aoi_sq_km(aoi):
    geom = GEOSGeometry(aoi, 4326).transform(5070, clone=True)
    return geom.area / 1000000


def create_excessive_aoi_size_error_msg(aoi):
    return ('Area of interest is too exceeds maximum size: submitted {} sq km '
            'but the maximum size is {}'.format(get_aoi_sq_km(aoi),
                                                settings.MMW_MAX_AREA))


def check_analyze_aoi_size_below_max_area(aoi):
    return get_aoi_sq_km(aoi) < settings.MMW_MAX_AREA


def create_invalid_shape_error_msg(aoi):
    return ('Area of interest is invalid: {}'.format(
            GEOSGeometry(aoi, 4326).valid_reason))


def check_aoi_does_not_self_intersect(aoi):
    return GEOSGeometry(aoi, 4326).valid


def create_shape_exceeds_conus_error_msg(aoi):
    return ('Area of interest boundaries must be within the boundaries of the '
            'continental United States')


def check_shape_in_conus(aoi):
    conus_boundaries = GEOSGeometry(
        json.dumps(settings.CONUS_PERIMETER['geometry']), 4326)
    return conus_boundaries.contains(GEOSGeometry(aoi, 4326))
