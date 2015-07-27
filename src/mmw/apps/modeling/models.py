# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib.gis.db import models
from django.contrib.auth.models import User


class Project(models.Model):
    TR55 = 'tr-55'
    MODEL_PACKAGES = ((TR55, 'Simple Model'),)

    user = models.ForeignKey(User)
    name = models.CharField(
        max_length=255)
    area_of_interest = models.MultiPolygonField(
        null=True,
        help_text='Base geometry for all scenarios of project')
    is_private = models.BooleanField(
        default=True)
    model_package = models.CharField(
        choices=MODEL_PACKAGES,
        max_length=255,
        help_text='Which model pack was chosen for this project')
    created_at = models.DateTimeField(
        auto_now=False,
        auto_now_add=True)
    modified_at = models.DateTimeField(
        auto_now=True)
    is_activity = models.BooleanField(
        default=False,
        help_text='Projects with special properties')

    def __unicode__(self):
        return self.name


class Scenario(models.Model):

    class Meta:
        unique_together = ('name', 'project')

    name = models.CharField(
        max_length=255)
    project = models.ForeignKey(Project, related_name='scenarios')
    is_current_conditions = models.BooleanField(
        default=False,
        help_text='A special type of scenario without modification abilities')
    inputs = models.TextField(
        null=True,
        help_text='Serialized JSON representation of scenario inputs')
    inputmod_hash = models.CharField(
        max_length=255,
        null=True,
        help_text='A hash of the values for inputs & modifications to ' +
                  'compare to the existing model results, to determine if ' +
                  'the persisted result apply to the current values')
    modifications = models.TextField(
        null=True,
        help_text='Serialized JSON representation of scenarios modifications ')
    modification_hash = models.CharField(
        max_length=255,
        null=True,
        help_text='A hash of the values for modifications to ' +
                  'compare to the existing model results, to determine if ' +
                  'the persisted result apply to the current values')
    census = models.TextField(
        null=True,
        help_text='Serialized JSON representation of geoprocessing results')
    results = models.TextField(
        null=True,
        help_text='Serialized JSON representation of the model results')
    created_at = models.DateTimeField(
        auto_now=False,
        auto_now_add=True)
    modified_at = models.DateTimeField(
        auto_now=True)

    def __unicode__(self):
        return self.name
