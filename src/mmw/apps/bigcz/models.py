# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division


class ResourceLink(object):
    def __init__(self, type, href):
        self.type = type
        self.href = href


class Resource(object):
    def __init__(self, id, description, links, title,
                 created_at, updated_at, geom):
        self.id = id
        self.description = description
        self.links = links
        self.title = title
        self.created_at = created_at
        self.updated_at = updated_at
        self.geom = geom


class ResourceList(object):
    def __init__(self, api_url, catalog, count, results):
        self.api_url = api_url
        self.catalog = catalog
        self.count = count
        self.results = results


class BBox(object):
    """
    Bounding box from incoming search API request.
    """
    def __init__(self, value):
        try:
            xmin, ymin, xmax, ymax = value.split(',')
        except ValueError:
            raise ValueError('Expected bbox format: xmin,ymin,xmax,ymax')
        self.xmin = xmin
        self.xmax = xmax
        self.ymin = ymin
        self.ymax = ymax
