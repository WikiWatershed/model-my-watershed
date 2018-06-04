# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from datetime import date, timedelta
from timeout_decorator import timeout

from rest_framework.exceptions import ValidationError

from django.conf import settings

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


@timeout(settings.BIGCZ_CLIENT_TIMEOUT)
# NOTE: This @timeout decorator will have to be modified for a multi-threaded
# environment, with the use_signals=false attribute. Unfortunately, that does
# not support functions that return values that cannot be pickled, such as this
# very function, since suds responses are dynamic objects and not pickleable.
# In this case, we may have to deserialize the values herein. Read more here:
# https://github.com/pnpnpn/timeout-decorator#multithreading
# Alternatively, if https://github.com/ulmo-dev/ulmo/issues/155 is addressed,
# we can use the native timeout capabilities surfaced in Ulmo instead of this
# wrapper decorator.
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
    return wof.get_values(wsdl, site, variable, from_date, to_date, None)
