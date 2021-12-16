# -*- coding: utf-8 -*-
from django.urls import re_path
from apps.home.views import (
    home_page,
    project,
    project_clone,
    project_via_hydroshare_open,
    project_via_hydroshare_edit,
    projects,
)


app_name = 'home'
urlpatterns = [
    re_path(r'^$', home_page, name='home_page'),
    re_path(r'^draw/?$', home_page, name='home_page'),
    re_path(r'^account/?$', home_page, name='account'),
    re_path(r'^projects/$', projects, name='projects'),
    re_path(r'^project/$', project, name='project'),
    re_path(r'^project/new/', project, name='project'),
    re_path(r'^project/(?P<proj_id>[0-9]+)/$', project, name='project'),
    re_path(r'^project/(?P<proj_id>[0-9]+)/clone/?$',
            project_clone, name='project_clone'),
    re_path(r'^project/(?P<proj_id>[0-9]+)/scenario/(?P<scenario_id>[0-9]+)/$',
            project, name='project'),
    re_path(r'^project/compare/$', project, name='project'),
    re_path(r'^project/(?P<proj_id>[0-9]+)/compare/$',
            project, name='project'),
    re_path(r'^project/via/hydroshare/(?P<resource>\w+)/?$',
            project_via_hydroshare_open, name='project_via_hydroshare_open'),
    re_path(r'^project/via/hydroshare/(?P<resource>\w+)/open/?$',
            project_via_hydroshare_open, name='project_via_hydroshare_open'),
    re_path(r'^project/via/hydroshare/(?P<resource>\w+)/edit/?$',
            project_via_hydroshare_edit, name='project_via_hydroshare_edit'),
    re_path(r'^analyze$', home_page, name='analyze'),
    re_path(r'^search$', home_page, name='search'),
    re_path(r'^error', home_page, name='error'),
    re_path(r'^sign-up', home_page, name='sign_up'),
]
