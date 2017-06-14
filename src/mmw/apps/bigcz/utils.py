# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import dateutil.parser


def parse_date(value):
    if not value:
        return None
    return dateutil.parser.parse(value)
