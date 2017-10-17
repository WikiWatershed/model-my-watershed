# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from rest_framework.permissions import BasePermission
from rest_framework.authentication import TokenAuthentication


class IsTokenAuthenticatedOrNotSwagger(BasePermission):
    """
    TODO This is just to test the token authentication
    Only anonymous requests from the client app should
    be allowed:
    https://github.com/WikiWatershed/model-my-watershed/issues/2270
    Currently all anonymous requests are allowed, unless you're using
    swagger
    """

    def has_permission(self, request, view):
        from_swagger = 'api/docs' in request.META['HTTP_REFERER'] \
                       if 'HTTP_REFERER' in request.META else False
        token_authenticated = type(request.successful_authenticator) \
            is TokenAuthentication
        return not from_swagger or token_authenticated
