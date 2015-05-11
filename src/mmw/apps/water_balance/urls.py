# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.water_balance import views


urlpatterns = patterns(
    '',
    url(r'^$', views.home_page, name='home_page'),
)
