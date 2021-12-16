# -*- coding: utf-8 -*-
from django.contrib.gis.geos import Polygon


class ResourceLink(object):
    def __init__(self, type, href):
        self.type = type
        self.href = href


class Resource(object):
    def __init__(self, id, description, author, links, title,
                 created_at, updated_at, geom):
        self.id = id
        self.title = title
        self.description = description
        self.author = author
        self.links = links
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
    def __init__(self, xmin, ymin, xmax, ymax):
        self.xmin = xmin
        self.xmax = xmax
        self.ymin = ymin
        self.ymax = ymax

    def area(self):
        polygon = Polygon.from_bbox((
            self.xmin, self.ymin,
            self.xmax, self.ymax))
        polygon.srid = 4326

        return polygon.transform(5070, clone=True).area
