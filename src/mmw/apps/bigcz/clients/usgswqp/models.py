# -*- coding: utf-8 -*-
from apps.bigcz.models import Resource


class USGSResource(Resource):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom, details_url, sample_mediums,
                 variables, service_org, service_orgname, service_code,
                 service_url, service_title, service_citation,
                 begin_date, end_date, monitoring_type, provider_name):
        super(USGSResource, self).__init__(id, description, author, links,
                                           title, created_at, updated_at,
                                           geom)

        self.details_url = details_url
        self.sample_mediums = sample_mediums
        self.variables = variables
        self.service_org = service_org
        self.service_orgname = service_orgname
        self.service_code = service_code
        self.service_url = service_url
        self.service_title = service_title
        self.service_citation = service_citation
        self.begin_date = begin_date
        self.end_date = end_date
        self.monitoring_type = monitoring_type
        self.provider_name = provider_name
