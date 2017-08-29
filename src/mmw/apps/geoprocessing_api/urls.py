# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex
from apps.geoprocessing_api import views

urlpatterns = patterns(
    '',
    url(r'analyze/land/$', views.start_analyze_land,
        name='start_analyze_land'),
    url(r'analyze/soil/$', views.start_analyze_soil,
        name='start_analyze_soil'),
    url(r'analyze/animals/$', views.start_analyze_animals,
        name='start_analyze_animals'),
    url(r'analyze/pointsource/$', views.start_analyze_pointsource,
        name='start_analyze_pointsource'),
    url(r'analyze/catchment-water-quality/$',
        views.start_analyze_catchment_water_quality,
        name='start_analyze_catchment_water_quality'),
    url(r'jobs/' + uuid_regex, get_job, name='get_job'),
    url(r'rwd/$', views.start_rwd, name='start_rwd'),
)
