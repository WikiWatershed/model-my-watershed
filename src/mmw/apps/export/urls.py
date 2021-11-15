# -*- coding: utf-8 -*-
from django.conf.urls import url

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex

from apps.export.views import hydroshare, shapefile, worksheet

app_name = 'export'
urlpatterns = [
    url(r'^hydroshare/?$', hydroshare, name='hydroshare'),
    url(r'^shapefile/?$', shapefile, name='shapefile'),
    url(r'^worksheet/?$', worksheet, name='worksheet'),
    url(r'jobs/' + uuid_regex, get_job, name='get_job'),
]
