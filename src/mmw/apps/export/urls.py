# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.export.views import hydroshare, shapefile

urlpatterns = patterns(
    '',
    url(r'^hydroshare/?$', hydroshare, name='hydroshare'),
    url(r'^shapefile/?$', shapefile, name='shapefile'),
)
