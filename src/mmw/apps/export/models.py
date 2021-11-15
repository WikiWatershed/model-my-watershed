# -*- coding: utf-8 -*-
from django.conf import settings
from django.contrib.gis.db import models

from apps.modeling.models import Project

HYDROSHARE_BASE_URL = settings.HYDROSHARE['base_url']


class HydroShareResource(models.Model):
    project = models.OneToOneField(Project,
                                   on_delete=models.CASCADE,
                                   related_name='hydroshare')
    resource = models.CharField(
        max_length=63,
        help_text='ID of Resource in HydroShare')
    title = models.CharField(
        max_length=255,
        help_text='Title of Resource in HydroShare')
    autosync = models.BooleanField(
        default=False,
        help_text='Whether to automatically push changes to HydroShare')
    exported_at = models.DateTimeField(
        help_text='Most recent export date')
    created_at = models.DateTimeField(
        auto_now=False,
        auto_now_add=True)
    modified_at = models.DateTimeField(
        auto_now=True)

    def _url(self):
        return '{}resource/{}'.format(HYDROSHARE_BASE_URL, self.resource)

    url = property(_url)

    def __unicode__(self):
        return '{} <{}>'.format(self.title, self.url)
