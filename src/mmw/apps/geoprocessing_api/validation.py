# -*- coding: utf-8 -*-
from numbers import Number
from uuid import UUID

from django.conf import settings

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
    return (f'Invalid required `location` parameter value `{loc}`. Must be a '
            '`[lat, lng] where `lat` and `lng` are numeric.')


def check_location_format(loc):
    if loc is None or type(loc) is not list or len(loc) != 2:
        return False
    else:
        [lat, lng] = loc
        return (isinstance(lat, Number) and isinstance(lng, Number) and
                type(lat) is not bool and type(lng) is not bool)


def create_invalid_rwd_data_source_error_msg(source):
    return (f'Invalid optional `dataSource` parameter value `{source}`.'
            ' Must be `drb` or `nhd`.')


def check_rwd_data_source(source):
    return source in ['drb', 'nhd']


def create_invalid_rwd_snapping_error_msg(snapping):
    return (f'Invalid optional `snappingOn` parameter value `{snapping}`.'
            ' Must be `true` or `false`.')


def create_invalid_rwd_simplify_param_type_error_msg(simplify):
    return (f'Invalid optional `simplify` parameter value: `{simplify}`.'
            ' Must be a number.')


def check_rwd_simplify_param_type(simplify):
    return isinstance(simplify, Number) or simplify is False


def validate_uuid(uuid):
    try:
        u = UUID(uuid)
    except ValueError:
        return False

    return uuid == str(u)


def validate_gwlfe_prepare(data):
    layer_overrides = data.get('layer_overrides', {})

    check_exactly_one_provided(['area_of_interest', 'wkaoi', 'huc'], data)

    not_valid_layers = check_layer_overrides_keys(layer_overrides)

    if not_valid_layers:
        error = create_layer_overrides_keys_not_valid_msg(not_valid_layers)
        raise ValidationError(error)

    if ('__LAND__' in layer_overrides.keys() and
            not check_land_layer_overrides(layer_overrides)):
        error = create_layer_overrides_land_not_valid_msg(LAND_LAYER_OVERRIDES)
        raise ValidationError(error)

    if ('__STREAMS__' in layer_overrides.keys() is not None and
            not check_streams_layer_overrides(layer_overrides)):
        error = (f'Invalid __STREAMS__ param: '
                 f'Must be one of {STREAM_LAYER_OVERRIDES}')
        raise ValidationError(error)


def validate_gwlfe_run(input):
    missing_keys = [k for k in GWLFE_INPUT_KEYS if k not in input]
    if missing_keys:
        raise ValidationError(f'Provided `input` is missing: {missing_keys}')


def check_exactly_one_provided(one_of: list, params: dict):
    # Dictionary for just the keys of which we want one of
    one_of_params = {k: params.get(k) for k in one_of}
    # List of keys with not None values
    not_none_keys = [k for k, v in one_of_params.items() if v is not None]
    if len(not_none_keys) != 1:
        raise ValidationError(
            f'Must provide exactly one of: {one_of}. '
            f'You provided values for: {not_none_keys}')


def check_layer_overrides_keys(layers):
    not_valid_layers = []
    for layer in layers.keys():
        if (layer not in settings.GEOP['layers'].keys()):
            not_valid_layers.append(layer)
    return not_valid_layers


def check_land_layer_overrides(layers):
    return layers['__LAND__'] in LAND_LAYER_OVERRIDES


def check_streams_layer_overrides(layers):
    return layers['__STREAMS__'] in STREAM_LAYER_OVERRIDES


def create_layer_overrides_keys_not_valid_msg(layers):
    error = 'These layers are not standard layers for layer overrides: '
    for layler in layers:
        error += layler + ' '
    error += '. Must be one of: __LAND__, __STREAMS__'
    return error


def create_layer_overrides_land_not_valid_msg(values):
    return (f'Invalid __LAND__ param: Must be one of {values}')


LAND_LAYER_OVERRIDES = [
     'nlcd-2019-30m-epsg5070-512-uint8raw',
     'nlcd-2016-30m-epsg5070-512-uint8raw',
     'nlcd-2011-30m-epsg5070-512-uint8raw',
     'nlcd-2006-30m-epsg5070-512-uint8raw',
     'nlcd-2001-30m-epsg5070-512-uint8raw',
     'nlcd-2011-30m-epsg5070-512-int8',
]

STREAM_LAYER_OVERRIDES = ['drb', 'nhdhr', 'nhd']

# These are not present in GWLFE_DEFAULTS, but are necessary for running GWLF-E
GWLFE_INPUT_KEYS = list(settings.GWLFE_DEFAULTS.keys()) + [
    'AEU', 'Acoef', 'AgLength', 'AgSlope3', 'AgSlope3To8', 'Area', 'AvKF',
    'AvSlope', 'CN', 'DayHrs', 'GrNitrConc', 'GrPhosConc', 'Grow', 'KF', 'KV',
    'LS', 'ManNitr', 'ManPhos', 'MaxWaterCap', 'NumNormalSys', 'P', 'PhosConc',
    'PointFlow', 'PointNitr', 'PointPhos', 'Prec', 'RecessionCoef',
    'SedAFactor', 'SedDelivRatio', 'SedNitr', 'SedPhos', 'StreamLength',
    'Temp', 'TotArea', 'UrbAreaTotal', 'UrbLength', 'WeatherStations',
    'WxYrBeg', 'WxYrEnd', 'WxYrs', 'n23', 'n23b', 'n24', 'n24b', 'n41', 'n41j',
    'n41k', 'n41l', 'n42', 'n42b', 'n46e', 'n46f']
