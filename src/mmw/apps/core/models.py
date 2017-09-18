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

    def __unicode__(self):
        return unicode(self.uuid)


class RequestLog(models.Model):
    user = models.ForeignKey(AUTH_USER_MODEL,
                             on_delete=models.SET_NULL,
                             null=True)
    job_uuid = models.UUIDField(
        null=True,
        help_text='If async request, the uuid of the submitted job')
    requested_at = models.DateTimeField(
        help_text='When the request was made')
    response_ms = models.PositiveIntegerField(
        help_text='How long the response took in ms')
    path = models.CharField(
        max_length=400,
        help_text='The requested URI')
    query_params = models.TextField(
        null=True,
        help_text='Stringified requested query params dictionary')
    status_code = models.PositiveIntegerField(
        help_text='HTTP status code sent back')
    method = models.CharField(
        max_length=255,
        help_text='HTTP method')
    host = models.URLField(
        help_text='The host from which the request was sent')
    remote_addr = models.GenericIPAddressField(
        help_text='The IP address from which the request was sent')

    def __unicode__(self):
        return self.user + " " + self.path
