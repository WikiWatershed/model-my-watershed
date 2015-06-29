# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url
from apps.home.views import home_page, project, compare


urlpatterns = patterns(
    '',
    url(r'^$', home_page, name='home_page'),
    url(r'^project/$', project, name='project'),
    url(r'^project/(?P<proj_id>[0-9]+)/$', project, name='project'),
    url(r'^project/(?P<proj_id>[0-9]+)/scenario/(?P<scenario_id>[0-9]+)/$',
        project, name='project'),
    url(r'^analyze$', home_page, name='analyze'),
    url(r'^compare$', compare, name='compare'),
    url(r'^error', home_page, name='error'),
    url(r'^sign-up', home_page, name='sign_up'),
)
