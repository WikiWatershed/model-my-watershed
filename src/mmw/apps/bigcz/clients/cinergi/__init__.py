# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.models import Resource
from apps.bigcz.serializers import ResourceSerializer

# Import catalog name and search function, so it can be exported from here
from apps.bigcz.clients.cinergi.search import CATALOG_NAME, search  # NOQA

model = Resource
serializer = ResourceSerializer
