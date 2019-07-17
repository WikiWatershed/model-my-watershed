# -*- coding: utf-8 -*-

from datetime import timedelta

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from rest_framework.authtoken.models import Token

from apps.core.models import UnitScheme

import countries


@receiver(post_save, sender=settings.AUTH_USER_MODEL)
def create_auth_token(sender, instance=None, created=False, **kwargs):
    """
    Create an auth token for every newly created user.
    """
    if created:
        Token.objects.create(user=instance)


class ItsiUserManager(models.Manager):
    def create_itsi_user(self, user, itsi_id):
        itsi_user = self.create(user=user, itsi_id=itsi_id)
        return itsi_user


class ItsiUser(models.Model):
    user = models.OneToOneField(User,
                                on_delete=models.CASCADE,
                                primary_key=True)
    itsi_id = models.IntegerField()

    objects = ItsiUserManager()

    def __unicode__(self):
        return unicode(self.user.username)


class UserProfile(models.Model):
    UNSPECIFIED = 'Unspecified'
    UNI_FACULTY = 'University Faculty'
    UNI_PROFESSIONAL = 'University Professional or Research Staff'
    POST_DOC = 'Post-Doctoral Fellow'
    UNI_GRAD_STU = 'University Graduate Student'
    UNI_UGRAD_STU = 'University Undergraduate Student'
    COMMERCIAL = 'Commercial/Professional'
    GOVERNMENT = 'Government Official'
    K_12_STU = 'School Student Kindergarten to 12th Grade'
    K_12_TEACHER = 'School Teacher Kindergarten to 12th Grade'
    OTHER = 'Other'

    USER_TYPE_CHOICES = (
        (UNSPECIFIED, UNSPECIFIED),
        (UNI_FACULTY, UNI_FACULTY),
        (UNI_PROFESSIONAL, UNI_PROFESSIONAL),
        (POST_DOC, POST_DOC),
        (UNI_GRAD_STU, UNI_GRAD_STU),
        (UNI_UGRAD_STU, UNI_UGRAD_STU),
        (COMMERCIAL, COMMERCIAL),
        (GOVERNMENT, GOVERNMENT),
        (K_12_STU, K_12_STU),
        (K_12_TEACHER, K_12_TEACHER),
        (OTHER, OTHER),
    )

    UNIT_SCHEME_CHOICES = (
        (UnitScheme.METRIC, 'Metric'),
        (UnitScheme.USCUSTOMARY, 'US Customary'),
    )

    user = models.OneToOneField(User,
                                on_delete=models.CASCADE,
                                primary_key=True)
    was_skipped = models.BooleanField(default=False)
    is_complete = models.BooleanField(default=False)
    has_seen_hotspot_info = models.BooleanField(default=False)
    organization = models.TextField(blank=True)
    user_type = models.TextField(choices=USER_TYPE_CHOICES,
                                 default=UNSPECIFIED)
    country = models.TextField(choices=countries.COUNTRY_CHOICES,
                               default=countries.US)
    postal_code = models.TextField(blank=True)
    unit_scheme = models.TextField(choices=UNIT_SCHEME_CHOICES,
                                   default=UnitScheme.METRIC)


class HydroShareToken(models.Model):
    """
    HydroShare Token details for a given user

    The following field names are same as in HydroShare OAuth2
    authorization interface and cannot be changed:
    access_token, token_type, expires_in, refresh_token, scope
    """
    user = models.OneToOneField(User,
                                on_delete=models.CASCADE,
                                primary_key=True)

    access_token = models.CharField(max_length=255)
    token_type = models.CharField(max_length=255, default='Bearer')
    expires_in = models.IntegerField(default=0)
    refresh_token = models.CharField(max_length=255)
    scope = models.CharField(max_length=255, default='read write')

    created_at = models.DateTimeField(auto_now=False, auto_now_add=True)
    modified_at = models.DateTimeField(auto_now=True)

    def __unicode__(self):
        return self.access_token if not self.is_expired else 'Expired'

    def _is_expired(self):
        now = timezone.now()
        refreshed = self.modified_at
        expiry = timedelta(seconds=self.expires_in)

        return now > refreshed + expiry

    is_expired = property(_is_expired)

    def get_oauth_dict(self):
        return {i: getattr(self, i)
                for i in ['access_token', 'token_type', 'expires_in',
                          'refresh_token', 'scope']}
