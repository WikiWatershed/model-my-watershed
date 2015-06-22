# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.db import models
from django.conf import settings

AUTH_USER_MODEL = getattr(settings, 'AUTH_USER_MODEL', 'auth.User')


class Job(models.Model):
    user = models.ForeignKey(AUTH_USER_MODEL, null=True)
    uuid = models.UUIDField(null=True)
    model_input = models.TextField()
    created_at = models.DateTimeField()
    result = models.TextField()
    delivered_at = models.DateTimeField(null=True)
    error = models.TextField()
    traceback = models.TextField()
    status = models.CharField(max_length=255)
