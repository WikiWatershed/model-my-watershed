# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.clients.hydroshare import models, serializers

# Import catalog name and search function, so it can be exported from here
from apps.bigcz.clients.hydroshare.search import CATALOG_NAME, search  # NOQA

model = models.HydroshareResource
serializer = serializers.HydroshareResourceSerializer
