# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

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
