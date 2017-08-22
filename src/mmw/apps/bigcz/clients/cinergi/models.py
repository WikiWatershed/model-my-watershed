# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import Resource


class CinergiResource(Resource):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom, cinergi_url):
        super(CinergiResource, self).__init__(id, description, author, links,
                                              title, created_at, updated_at,
                                              geom)

        self.cinergi_url = cinergi_url
