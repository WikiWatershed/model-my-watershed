# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url
from apps.home.views import home_page, compare
from apps.predefined_shapes.views import district


urlpatterns = patterns(
    '',
    url(r'^$', home_page, name='home_page'),
    url(r'^analyze$', home_page, name='home_page'),
    url(r'^api/congressional_districts$', district, name='district'),
    url(r'^api/congressional_districts/id/(?P<id>[0-9]+)$', district, name='district'),  # noqa
    url(r'^model$', home_page, name='home_page'),
    url(r'^compare$', compare, name='compare')
)
