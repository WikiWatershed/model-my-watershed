# -*- coding: utf-8 -*-
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth.models import User

from apps.user.models import ItsiUser


class SSOAuthenticationBackend(object):
    """
    A custom authentication back-end for Single Sign On providers.

    Before we can call django.contrib.auth.login on an SSO user, we must first
    authenticate them. This must be done using a custom authentication back-
    end, which sets the backend attribute on the user model.

    This class should be instantiated with an SSO provider user model, such
    as ItsiUser or ConcordUser, before it can be used.
    """
    def __init__(self, model, field):
        self.SSOUserModel = model
        self.SSOField = field

    def authenticate(self, sso_id=None):
        if sso_id is not None:
            try:
                query = {self.SSOField: sso_id}
                user = self.SSOUserModel.objects.get(**query).user
                return user
            except ObjectDoesNotExist:
                return None
        return None

    def get_user(self, user_id):
        try:
            return User.objects.get(pk=user_id)
        except User.DoesNotExist:
            return None


class ItsiAuthenticationBackend(SSOAuthenticationBackend):
    def __init__(self):
        super(ItsiAuthenticationBackend, self).__init__(
            ItsiUser, 'itsi_id')
