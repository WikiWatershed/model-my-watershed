# -*- coding: utf-8 -*-
from django.conf.urls import url

from apps.bigcz import views

app_name = 'bigcz'
urlpatterns = [
    url(r'^search$', views.search, name='search'),
    url(r'^details$', views.details, name='details'),
    url(r'^values$', views.values, name='values'),
]
