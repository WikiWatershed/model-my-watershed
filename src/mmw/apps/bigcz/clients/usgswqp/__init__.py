# -*- coding: utf-8 -*-
from __future__ import (absolute_import,
                        division,
                        print_function,
                        unicode_literals)

from apps.bigcz.clients.usgswqp.models import USGSResource
from apps.bigcz.clients.usgswqp.serializers import USGSResourceSerializer

# Import catalog name and search function, so it can be exported from here
from apps.bigcz.clients.usgswqp.search import CATALOG_NAME, search  # NOQA

model = USGSResource
serializer = USGSResourceSerializer
