# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.bigcz.clients import cinergi, hydroshare, cuahsi

CATALOGS = {
    cinergi.CATALOG_NAME: {
        'model': cinergi.model,
        'serializer': cinergi.serializer,
        'search': cinergi.search,
    },
    hydroshare.CATALOG_NAME: {
        'model': hydroshare.model,
        'serializer': hydroshare.serializer,
        'search': hydroshare.search,
    },
    cuahsi.CATALOG_NAME: {
        'model': cuahsi.model,
        'serializer': cuahsi.serializer,
        'search': cuahsi.search,
    },
}
