# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex

from apps.export.views import hydroshare, shapefile, worksheet

app_name = 'export'
urlpatterns = [
    re_path(r'^hydroshare/?$', hydroshare, name='hydroshare'),
    re_path(r'^shapefile/?$', shapefile, name='shapefile'),
    re_path(r'^worksheet/?$', worksheet, name='worksheet'),
    re_path(r'jobs/' + uuid_regex, get_job, name='get_job'),
]
