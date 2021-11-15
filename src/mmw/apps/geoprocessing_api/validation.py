# -*- coding: utf-8 -*-
from numbers import Number

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


def create_invalid_rwd_location_format_error_msg(loc):
    return ('Invalid required `location` parameter value `{}`. Must be a '
            '`[lat, lng] where `lat` and `lng` are numeric.'.format(loc))


def check_location_format(loc):
    if loc is None or type(loc) is not list or len(loc) != 2:
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
