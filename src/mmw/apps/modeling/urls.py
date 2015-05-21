# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.modeling import views

# uuid4 has special characteristics.
# https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_.28random.29
# {12 chars}-{4 chars}-{4 chars}-{4 chars}-{12 chars}
# Third set of characters must start with a '4'.
# Fourth set of characters must start with one of 'a,b,8,9'.
uuid_regex = '(?P<job_uuid>[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-' \
             + '[89abAB][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12})/$'

urlpatterns = patterns(
    '',
    url(r'start/analyze/$', views.start_analyze, name='start_analyze'),
    url(r'jobs/' + uuid_regex, views.get_job, name='get_job'),
    url(r'start/tr55/$', views.start_tr55, name='start_tr55'),
    url(r'boundary_layers/$', views.boundary_layers, name='boundary_layers'),
    url(r'congressional_districts$', views.district, name='district'),
    url(r'congressional_districts/id/(?P<id>[0-9]+)$', views.district, name='district'),  # noqa
)
