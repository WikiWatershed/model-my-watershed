# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division


class ResourceLink(object):
    def __init__(self, type, href):
        self.type = type
        self.href = href


class Resource(object):
    def __init__(self, id, title, description, links, created_at, updated_at):
        self.id = id
        self.title = title
        self.description = description
        self.links = links
        self.created_at = created_at
        self.updated_at = updated_at


class ResourceList(object):
    def __init__(self, catalog, results, count):
        self.catalog = catalog
        self.results = results
        self.count = count


class BBox(object):
    def __init__(self, value):
        try:
            xmin, ymin, xmax, ymax = value.split(',')
        except ValueError:
            raise ValueError('Expected bbox format: xmin,ymin,xmax,ymax')
        self.xmin = xmin
        self.xmax = xmax
        self.ymin = ymin
        self.ymax = ymax
