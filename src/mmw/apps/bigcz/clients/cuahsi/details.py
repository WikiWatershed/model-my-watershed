# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from datetime import date, timedelta

from rest_framework.exceptions import ValidationError

from ulmo.cuahsi import wof

DATE_FORMAT = '%m/%d/%Y'


def details(wsdl, site):
    if not wsdl:
        raise ValidationError({
            'error': 'Required argument: wsdl'})

    if not site:
        raise ValidationError({
            'error': 'Required argument: site'})

    return wof.get_site_info(wsdl, site)


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

    return wof.get_values(wsdl, site, variable, from_date, to_date)
