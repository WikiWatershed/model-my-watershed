# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import url
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
    url(r'^$', home_page, name='home_page'),
    url(r'^draw/?$', home_page, name='home_page'),
    url(r'^account/?$', home_page, name='account'),
    url(r'^projects/$', projects, name='projects'),
    url(r'^project/$', project, name='project'),
    url(r'^project/new/', project, name='project'),
    url(r'^project/(?P<proj_id>[0-9]+)/$', project, name='project'),
    url(r'^project/(?P<proj_id>[0-9]+)/clone/?$',
        project_clone, name='project_clone'),
    url(r'^project/(?P<proj_id>[0-9]+)/scenario/(?P<scenario_id>[0-9]+)/$',
        project, name='project'),
    url(r'^project/compare/$', project, name='project'),
    url(r'^project/(?P<proj_id>[0-9]+)/compare/$', project, name='project'),
    url(r'^project/via/hydroshare/(?P<resource>\w+)/?$',
        project_via_hydroshare_open, name='project_via_hydroshare_open'),
    url(r'^project/via/hydroshare/(?P<resource>\w+)/open/?$',
        project_via_hydroshare_open, name='project_via_hydroshare_open'),
    url(r'^project/via/hydroshare/(?P<resource>\w+)/edit/?$',
        project_via_hydroshare_edit, name='project_via_hydroshare_edit'),
    url(r'^analyze$', home_page, name='analyze'),
    url(r'^search$', home_page, name='search'),
    url(r'^error', home_page, name='error'),
    url(r'^sign-up', home_page, name='sign_up'),
]
