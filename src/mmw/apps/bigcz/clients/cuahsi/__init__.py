# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.clients.cuahsi.models import CuahsiResource
from apps.bigcz.clients.cuahsi.serializers import CuahsiResourceSerializer

# Import catalog name and search function, so it can be exported from here
from apps.bigcz.clients.cuahsi.search import CATALOG_NAME, search  # NOQA
from apps.bigcz.clients.cuahsi.details import details  # NOQA

model = CuahsiResource
serializer = CuahsiResourceSerializer
