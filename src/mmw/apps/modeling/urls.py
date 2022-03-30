# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.modeling import views

# uuid4 has special characteristics.
# https://en.wikipedia.org/wiki/Universally_unique_identifier#Version_4_.28random.29
# {12 chars}-{4 chars}-{4 chars}-{4 chars}-{12 chars}
# Third set of characters must start with a '4'.
# Fourth set of characters must start with one of 'a,b,8,9'.
uuid_regex = '(?P<job_uuid>[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-4[0-9A-Fa-f]{3}-' \
             + '[89abAB][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12})'

app_name = 'modeling'
urlpatterns = [
    re_path(r'projects/$', views.projects, name='projects'),
    re_path(r'projects/(?P<proj_id>[0-9]+)$', views.project, name='project'),
    re_path(r'projects/(?P<proj_id>[0-9]+)/weather/(?P<category>\w+)?$',
            views.project_weather,
            name='project_weather'),
    re_path(r'scenarios/$', views.scenarios, name='scenarios'),
    re_path(r'scenarios/(?P<scen_id>[0-9]+)$',
            views.scenario,
            name='scenario'),
    re_path(r'scenarios/(?P<scen_id>[0-9]+)/duplicate/?$',
            views.scenario_duplicate,
            name='scenario_duplicate'),
    re_path(r'scenarios/(?P<scen_id>[0-9]+)/custom-weather-data/?$',
            views.scenario_custom_weather_data,
            name='scenario_custom_weather_data'),
    re_path(r'scenarios/(?P<scen_id>[0-9]+)/custom-weather-data/download/?$',
            views.scenario_custom_weather_data_download,
            name='scenario_custom_weather_data_download'),
    re_path(r'mapshed/$', views.start_mapshed, name='start_mapshed'),
    re_path(f'jobs/{uuid_regex}/$', views.get_job, name='get_job'),
    re_path(r'tr55/$', views.start_tr55, name='start_tr55'),
    re_path(r'gwlfe/$', views.start_gwlfe, name='start_gwlfe'),
    re_path(r'subbasins/$', views.subbasins_detail, name='subbasins_detail'),
    re_path(r'subbasins/catchments/$',
            views.subbasin_catchments_detail,
            name='subbasin_catchments_detail'),
    re_path(r'boundary-layers/(?P<table_code>\w+)/(?P<obj_id>[0-9]+)/$',
            views.boundary_layer_detail,
            name='boundary_layer_detail'),
    re_path(r'boundary-layers-search/$',
            views.boundary_layer_search,
            name='boundary_layer_search'),
    re_path(r'export/gms/?$', views.export_gms, name='export_gms'),
    re_path(r'point-source/$',
            views.drb_point_sources,
            name='drb_point_sources'),
    re_path(r'weather-stations/$',
            views.weather_stations,
            name='weather_stations'),
]
