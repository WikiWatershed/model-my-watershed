# -*- coding: utf-8 -*-
from django.urls import re_path

from apps.user.views import (login,
                             profile,
                             sign_up,
                             forgot,
                             resend,
                             change_password,
                             logout,
                             itsi_login,
                             itsi_auth,
                             concord_login,
                             concord_auth,
                             hydroshare_login,
                             hydroshare_auth,
                             hydroshare_logout,
                             )

app_name = 'user'
urlpatterns = [
    re_path(r'^logout$', logout, name='logout'),
    re_path(r'^itsi/login$', itsi_login, name='itsi_login'),
    re_path(r'^itsi/authenticate$', itsi_auth, name='itsi_auth'),
    re_path(r'^concord/login/?$', concord_login, name='concord_login'),
    re_path(r'^concord/authenticate/?$', concord_auth, name='concord_auth'),
    re_path(r'^hydroshare/login', hydroshare_login, name='hydroshare_login'),
    re_path(r'^hydroshare/authorize', hydroshare_auth, name='hydroshare_auth'),
    re_path(r'^hydroshare/logout',
            hydroshare_logout, name='hydroshare_logout'),
    re_path(r'^login$', login, name='login'),
    re_path(r'^profile$', profile, name='profile'),
    re_path(r'^sign_up$', sign_up, name='sign_up'),
    re_path(r'^resend$', resend, name='resend'),
    re_path(r'^forgot$', forgot, name='forgot'),
    re_path(r'^change-password$', change_password, name='change_password'),
]
