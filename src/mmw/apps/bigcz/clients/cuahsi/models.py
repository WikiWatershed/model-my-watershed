# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import Resource


class CuahsiResource(Resource):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom, details_url, sample_mediums,
                 variables, service_org, service_code, service_url,
                 service_title, service_citation,
                 begin_date, end_date):
        super(CuahsiResource, self).__init__(id, description, author, links,
                                             title, created_at, updated_at,
                                             geom)

        self.details_url = details_url
        self.sample_mediums = sample_mediums
        self.variables = variables
        self.service_org = service_org
        self.service_code = service_code
        self.service_url = service_url
        self.service_title = service_title
        self.service_citation = service_citation
        self.begin_date = begin_date
        self.end_date = end_date
