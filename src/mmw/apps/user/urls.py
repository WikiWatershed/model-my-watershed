# -*- coding: utf-8 -*-
from django.conf.urls import url

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
    url(r'^logout$', logout, name='logout'),
    url(r'^itsi/login$', itsi_login, name='itsi_login'),
    url(r'^itsi/authenticate$', itsi_auth, name='itsi_auth'),
    url(r'^concord/login/?$', concord_login, name='concord_login'),
    url(r'^concord/authenticate/?$', concord_auth, name='concord_auth'),
    url(r'^hydroshare/login', hydroshare_login, name='hydroshare_login'),
    url(r'^hydroshare/authorize', hydroshare_auth, name='hydroshare_auth'),
    url(r'^hydroshare/logout', hydroshare_logout, name='hydroshare_logout'),
    url(r'^login$', login, name='login'),
    url(r'^profile$', profile, name='profile'),
    url(r'^sign_up$', sign_up, name='sign_up'),
    url(r'^resend$', resend, name='resend'),
    url(r'^forgot$', forgot, name='forgot'),
    url(r'^change-password$', change_password,
        name='change_password'),
]
