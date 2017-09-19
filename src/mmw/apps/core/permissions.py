# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework.permissions import BasePermission
from rest_framework.authentication import TokenAuthentication

from django.conf import settings


class IsTokenAuthenticatedOrClientApp(BasePermission):
    """
    Global permission check for request being
    (a) from a whitelisted IP
      ie. is this our own client web app and not the swagger docs?
    (b) from a user authenticated via auth token
    """

    def has_permission(self, request, view):
        ip_addr = request.META['REMOTE_ADDR']
        from_swagger = 'api/docs' in request.META['HTTP_REFERER'] \
                       if 'HTTP_REFERER' in request.META else False
        whitelisted = ip_addr in settings.ALLOWED_HOSTS
        token_authenticated = type(request.successful_authenticator) \
            is TokenAuthentication
        return (not from_swagger and whitelisted) or token_authenticated
