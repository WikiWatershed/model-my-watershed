# -*- coding: utf-8 -*-
from django.conf.urls import url

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex
from apps.geoprocessing_api import views


app_name = 'geoprocessing_api'
urlpatterns = [
    url(r'^token/', views.get_auth_token,
        name="authtoken"),
    url(r'analyze/land/(?P<nlcd_year>\w+)/?$', views.start_analyze_land,
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
    url(r'analyze/streams/(?P<datasource>\w+)/?$', views.start_analyze_streams,
        name='start_analyze_streams'),
    url(r'analyze/terrain/$', views.start_analyze_terrain,
        name='start_analyze_terrain'),
    url(r'analyze/protected-lands/$', views.start_analyze_protected_lands,
        name='start_analyze_protected_lands'),
    url(r'analyze/drb-2100-land/(?P<key>\w+)/$',
        views.start_analyze_drb_2100_land,
        name='start_analyze_drb_2100_land'),
    url(r'jobs/' + uuid_regex, get_job, name='get_job'),
    url(r'modeling/worksheet/$', views.start_modeling_worksheet,
        name='start_modeling_worksheet'),
    url(r'watershed/$', views.start_rwd, name='start_rwd'),
]
