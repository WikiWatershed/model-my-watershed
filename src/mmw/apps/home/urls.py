# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url
from apps.home.views import home_page, model, compare


urlpatterns = patterns(
    '',
    url(r'^$', home_page, name='home_page'),
    url(r'^model/$', model, name='model'),
    url(r'^model/(?P<proj_id>[0-9]+)/$', model, name='model'),
    url(r'^analyze$', home_page, name='analyze'),
    url(r'^compare$', compare, name='compare'),
    url(r'^error', home_page, name='error'),
)
