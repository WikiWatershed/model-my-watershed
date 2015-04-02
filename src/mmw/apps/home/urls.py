# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.home.views import home_page, analyze, model, compare


urlpatterns = patterns(
    '',
    url(r'^$', home_page, name='home_page'),
    url(r'^analyze$', analyze, name='analyze'),
    url(r'^model$', model, name='model'),
    url(r'^compare$', compare, name='compare'),
)
