# -*- coding: utf-8 -*-

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from rest_framework.authtoken.models import Token

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
    user = models.OneToOneField(User, primary_key=True)
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

    user = models.OneToOneField(User, primary_key=True)
    was_skipped = models.BooleanField(default=False)
    is_complete = models.BooleanField(default=False)
    organization = models.TextField(blank=True)
    user_type = models.TextField(choices=USER_TYPE_CHOICES,
                                 default=UNSPECIFIED)
    country = models.TextField(choices=countries.COUNTRY_CHOICES,
                               default=countries.US)
    postal_code = models.TextField(blank=True)
