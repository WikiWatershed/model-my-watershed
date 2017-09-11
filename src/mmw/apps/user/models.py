# -*- coding: utf-8 -*-

from django.conf import settings
from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

from rest_framework.authtoken.models import Token


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
