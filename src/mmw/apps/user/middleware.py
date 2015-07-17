# -*- coding: utf-8 -*-

from django.conf import settings
from django.core.urlresolvers import reverse
from django.shortcuts import redirect

from apps.user.views import itsi_login

EMBED_FLAG = settings.ITSI['embed_flag']
LOGIN_URL = reverse(itsi_login)


class ItsiAuthenticationMiddleware(object):
    """
    Middleware for automatically logging in ITSI users
    and setting relevant flags.
    """

    def process_request(self, request):
        """
        Check if ITSI EMBED FLAG is set, and if so attempt to log
        the user in with their ITSI credentials
        """

        # If flag is not set then return None so Django can proceed
        # with the request as-is
        if request.GET.get(EMBED_FLAG, 'false') != 'true':
            return None

        # Flag is set. Assume user is not logged in. Set session flag and
        # Redirect them to ITSI LOGIN URL
        request.session[EMBED_FLAG] = True
        return redirect(LOGIN_URL)
