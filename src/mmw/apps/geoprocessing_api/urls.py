# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.modeling.views import get_job
from apps.modeling.urls import uuid_regex
from apps.geoprocessing_api import views


app_name = 'geoprocessing_api'
urlpatterns = [
    re_path(r'^token/', views.get_auth_token,
            name="authtoken"),
    re_path(r'analyze/land/(?P<nlcd_year>\w+)/?$', views.start_analyze_land,
            name='start_analyze_land'),
    re_path(r'analyze/soil/$', views.start_analyze_soil,
            name='start_analyze_soil'),
    re_path(r'analyze/animals/$', views.start_analyze_animals,
            name='start_analyze_animals'),
    re_path(r'analyze/pointsource/$', views.start_analyze_pointsource,
            name='start_analyze_pointsource'),
    re_path(r'analyze/catchment-water-quality/$',
            views.start_analyze_catchment_water_quality,
            name='start_analyze_catchment_water_quality'),
    re_path(r'analyze/climate/$', views.start_analyze_climate,
            name='start_analyze_climate'),
    re_path(r'analyze/streams/(?P<datasource>\w+)/?$',
            views.start_analyze_streams,
            name='start_analyze_streams'),
    re_path(r'analyze/terrain/$', views.start_analyze_terrain,
            name='start_analyze_terrain'),
    re_path(r'analyze/protected-lands/$', views.start_analyze_protected_lands,
            name='start_analyze_protected_lands'),
    re_path(r'analyze/drb-2100-land/(?P<key>\w+)/$',
            views.start_analyze_drb_2100_land,
            name='start_analyze_drb_2100_land'),
    re_path(r'jobs/' + uuid_regex, get_job, name='get_job'),
    re_path(r'modeling/worksheet/$', views.start_modeling_worksheet,
            name='start_modeling_worksheet'),
    re_path(r'modeling/gwlf-e/prepare/$', views.start_modeling_gwlfe_prepare,
            name='start_modeling_gwlfe_prepare'),
    re_path(r'modeling/gwlf-e/run/$', views.start_modeling_gwlfe_run,
            name='start_modeling_gwlfe_run'),
    re_path(r'modeling/subbasin/prepare/$',
            views.start_modeling_subbasin_prepare,
            name='start_modeling_subbasin_prepare'),
    re_path(r'watershed/$', views.start_rwd, name='start_rwd'),
]
