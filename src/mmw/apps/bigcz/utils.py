# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.exceptions import APIException
import dateutil.parser


def parse_date(value):
    if not value:
        return None
    return dateutil.parser.parse(value)


class RequestTimedOutError(APIException):
    status_code = 408
    default_detail = 'Requested resource timed out.'
    default_code = 'request_timeout'
