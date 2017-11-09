# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import Resource


class CinergiResource(Resource):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom, cinergi_url,
                 source_name, contact_organizations, contact_people,
                 categories, begin_date, end_date,
                 resource_type, resource_topic_categories,
                 web_resources, web_services):
        super(CinergiResource, self).__init__(id, description, author, links,
                                              title, created_at, updated_at,
                                              geom)

        self.cinergi_url = cinergi_url
        self.source_name = source_name
        self.contact_organizations = contact_organizations
        self.contact_people = contact_people
        self.categories = categories
        self.begin_date = begin_date
        self.end_date = end_date
        self.resource_type = resource_type
        self.resource_topic_categories = resource_topic_categories
        self.web_resources = web_resources
        self.web_services = web_services
