# -*- coding: utf-8 -*-
from datetime import date, timedelta
from socket import timeout

from rest_framework.exceptions import ValidationError

from django.conf import settings

from apps.bigcz.utils import ValuesTimedOutError

DATE_FORMAT = '%m/%d/%Y'


def details(wsdl, site):
    if not wsdl:
        raise ValidationError({
            'error': 'Required argument: wsdl'})

    if not site:
        raise ValidationError({
            'error': 'Required argument: site'})

    if not wsdl.upper().endswith('?WSDL'):
        wsdl += '?WSDL'

    from ulmo.cuahsi import wof
    return wof.get_site_info(wsdl, site, None)


def values(wsdl, site, variable, from_date=None, to_date=None):
    if not wsdl:
        raise ValidationError({
            'error': 'Required argument: wsdl'})

    if not site:
        raise ValidationError({
            'error': 'Required argument: site'})

    if not variable:
        raise ValidationError({
            'error': 'Required argument: variable'})

    if not to_date:
        # Set to default value of today
        to_date = date.today().strftime(DATE_FORMAT)

    if not from_date:
        # Set to default value of one week ago
        from_date = (date.today() -
                     timedelta(days=7)).strftime(DATE_FORMAT)

    if not wsdl.upper().endswith('?WSDL'):
        wsdl += '?WSDL'

    from ulmo.cuahsi import wof
    try:
        return wof.get_values(wsdl, site, variable, from_date, to_date, None,
                              timeout=settings.BIGCZ_CLIENT_TIMEOUT)
    except timeout:
        raise ValuesTimedOutError()
