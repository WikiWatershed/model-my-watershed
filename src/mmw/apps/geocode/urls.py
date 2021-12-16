# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.geocode import views

app_name = 'geocode'
urlpatterns = [
    re_path(r'^$', views.geocode, name='geocode'),
]
