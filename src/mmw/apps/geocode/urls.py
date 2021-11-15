# -*- coding: utf-8 -*-
from django.conf.urls import url

from apps.geocode import views

app_name = 'geocode'
urlpatterns = [
    url(r'^$', views.geocode, name='geocode'),
]
