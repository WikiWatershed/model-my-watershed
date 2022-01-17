# -*- coding: utf-8 -*-
from django.conf import settings

from rest_framework.throttling import UserRateThrottle


class GeoprocessingApiUserRateThrottle(UserRateThrottle):
    """ Only throttle "real" users of the API, not the client app"""
    def allow_request(self, request, view):
        if request.user and \
           request.user.username == settings.CLIENT_APP_USERNAME:
            # If the user is the client app, pass through and
            # don't attempt any throttling
            return True

        return UserRateThrottle.allow_request(self, request, view)


class BurstRateThrottle(GeoprocessingApiUserRateThrottle):
    scope = 'burst'


class SustainedRateThrottle(GeoprocessingApiUserRateThrottle):
    scope = 'sustained'
