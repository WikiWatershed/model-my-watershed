# -*- coding: utf-8 -*-
from django.conf.urls import url

from apps.water_balance import views

app_name = 'water_balance'
urlpatterns = [
    url(r'^$', views.home_page, name='mini_app'),
]
