# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib.gis.db import models
from django.forms.models import model_to_dict


class District(models.Model):
    state_fips = models.CharField(
        max_length=2,
        help_text='State FIPS codes')
    state_short = models.CharField(
        max_length=2,
        help_text='State or territory name (short)')
    state_long = models.CharField(
        max_length=33,
        help_text='State or territory name (long)')
    district_fips = models.CharField(
        max_length=2,
        help_text='113th congress FIPS codes')
    aff_geoid = models.CharField(
        max_length=13,
        help_text='American FactFinder GeoID')
    geoid = models.CharField(
        max_length=4,
        help_text='GeoID')
    lsad = models.CharField(
        max_length=2,
        help_text='Legal/Statistical Area Description')
    polygon = models.MultiPolygonField(
        null=True,
        help_text='District polygon')

    def name(self):
        return str(self.state_short) + ' - ' + str(self.district_fips)

    def __str__(self):
        dictionary = model_to_dict(self)
        dictionary.pop('polygon', None)
        return str(dictionary)
