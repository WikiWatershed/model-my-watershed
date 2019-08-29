# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import url

from apps.geocode import views

app_name = 'geocode'
urlpatterns = [
    url(r'^$', views.geocode, name='geocode'),
]
