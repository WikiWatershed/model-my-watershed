# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import url

from apps.water_balance import views

app_name = 'water_balance'
urlpatterns = [
    url(r'^$', views.home_page, name='mini_app'),
]
