# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url
from apps.user.views import ajax_login, itsi_login, itsi_auth


urlpatterns = patterns(
    '',
    url(r'^ajaxlogin$', ajax_login, name='ajax_login'),
    url(r'^itsi/login$', itsi_login, name='itsi_login'),
    url(r'^itsi/authenticate$', itsi_auth, name='itsi_auth'),
)
