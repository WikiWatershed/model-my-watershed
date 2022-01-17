# -*- coding: utf-8 -*-
from apps.bigcz.clients.cuahsi.models import CuahsiResource
from apps.bigcz.clients.cuahsi.serializers import CuahsiResourceSerializer

# Import catalog name and search function, so it can be exported from here
from apps.bigcz.clients.cuahsi.search import CATALOG_NAME, search  # NOQA
from apps.bigcz.clients.cuahsi.details import details, values  # NOQA

model = CuahsiResource
serializer = CuahsiResourceSerializer
