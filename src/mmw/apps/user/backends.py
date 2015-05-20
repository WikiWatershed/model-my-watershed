# -*- coding: utf-8 -*-
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User

from apps.user.models import ItsiUser


class ItsiAuthenticationBackend(object):
    """
    A custom authentication back-end for ITSI Portal.

    Before we can call django.contrib.auth.login on an ITSI user, we must first
    authenticate them. This must be done using a custom authentication back-
    end, which sets the backend attribute on the user model.
    """

    def authenticate(self, itsi_id=None):
        if itsi_id is not None:
            try:
                user = ItsiUser.objects.get(itsi_id=itsi_id).user
                return user
            except ObjectDoesNotExist:
                return None
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None
