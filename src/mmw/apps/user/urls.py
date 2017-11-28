# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.user.views import (login,
                             profile,
                             sign_up,
                             forgot,
                             resend,
                             change_password,
                             logout,
                             itsi_login,
                             itsi_auth,
                             hydroshare_login,
                             hydroshare_auth,
                             )

urlpatterns = patterns(
    '',
    url(r'^logout$', logout, name='logout'),
    url(r'^itsi/login$', itsi_login, name='itsi_login'),
    url(r'^itsi/authenticate$', itsi_auth, name='itsi_auth'),
    url(r'^hydroshare/login', hydroshare_login, name='hydroshare_login'),
    url(r'^hydroshare/authorize', hydroshare_auth, name='hydroshare_auth'),
    url(r'^login$', login, name='login'),
    url(r'^profile$', profile, name='profile'),
    url(r'^sign_up$', sign_up, name='sign_up'),
    url(r'^resend$', resend, name='resend'),
    url(r'^forgot$', forgot, name='forgot'),
    url(r'^change-password$', change_password,
        name='change_password'),
)
