# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import Resource


class HydroshareResource(Resource):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom, begin_date, end_date):
        super(HydroshareResource, self).__init__(id, description, author,
                                                 links, title, created_at,
                                                 updated_at, geom)

        self.begin_date = begin_date
        self.end_date = end_date
