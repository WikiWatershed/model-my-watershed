# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.water_balance import views

app_name = 'water_balance'
urlpatterns = [
    re_path(r'^$', views.home_page, name='mini_app'),
]
