# -*- coding: utf-8 -*-
from django.conf import settings
from rest_framework.exceptions import ValidationError


def validate_aoi(aoi):
    if not check_analyze_aoi_size_below_max_area(aoi):
        error = create_excessive_aoi_size_error_msg(aoi)
        raise ValidationError(error)

    if not check_aoi_does_not_self_intersect(aoi):
        error = create_invalid_shape_error_msg(aoi)
        raise ValidationError(error)

    pass


def get_aoi_sq_km(aoi):
    geom = aoi.transform(5070, clone=True)
    return geom.area / 1000000


def create_excessive_aoi_size_error_msg(aoi):
    return ('Area of interest is too exceeds maximum size:'
            f' submitted {get_aoi_sq_km(aoi)} sq km'
            f' but the maximum size is {settings.MMW_MAX_AREA}')


def check_analyze_aoi_size_below_max_area(aoi):
    return get_aoi_sq_km(aoi) < settings.MMW_MAX_AREA


def create_invalid_shape_error_msg(aoi):
    return f'Area of interest is invalid: {aoi.valid_reason}'


def check_aoi_does_not_self_intersect(aoi):
    return aoi.valid
