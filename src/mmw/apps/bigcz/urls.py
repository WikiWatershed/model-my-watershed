# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.bigcz import views

app_name = 'bigcz'
urlpatterns = [
    re_path(r'^search$', views.search, name='search'),
    re_path(r'^details$', views.details, name='details'),
    re_path(r'^values$', views.values, name='values'),
]
