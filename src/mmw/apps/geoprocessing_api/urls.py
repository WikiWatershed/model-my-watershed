# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import include, patterns, url

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex
from apps.geoprocessing_api import views


urlpatterns = patterns(
    '',
    url(r'^docs/', include('rest_framework_swagger.urls')),
    url(r'^token/', views.get_auth_token,
        name="authtoken"),
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
    url(r'analyze/climate/$', views.start_analyze_climate,
        name='start_analyze_climate'),
    url(r'analyze/streams/$', views.start_analyze_streams,
        name='start_analyze_streams'),
    url(r'jobs/' + uuid_regex, get_job, name='get_job'),
    url(r'watershed/$', views.start_rwd, name='start_rwd'),
)
