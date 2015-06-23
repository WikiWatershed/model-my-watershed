# -*- coding: utf-8 -*-
from django.contrib.auth.models import User
from django.db import models


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
