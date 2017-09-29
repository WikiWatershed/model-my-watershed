# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.bigcz import views

urlpatterns = patterns(
    '',
    url(r'^search$', views.search, name='bigcz_search'),
    url(r'^details$', views.details, name='bigcz_details'),
)
