# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
    ]

    operations = [
        migrations.CreateModel(
            name='District',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('state_fips', models.CharField(help_text='State FIPS codes', max_length=2)),
                ('state_short', models.CharField(help_text='State or territory name (short)', max_length=2)),
                ('state_long', models.CharField(help_text='State or territory name (long)', max_length=33)),
                ('district_fips', models.CharField(help_text='113th congress FIPS codes', max_length=2)),
                ('aff_geoid', models.CharField(help_text='American FactFinder GeoID', max_length=13)),
                ('geoid', models.CharField(help_text='GeoID', max_length=4)),
                ('lsad', models.CharField(help_text='Legal/Statistical Area Description', max_length=2)),
                ('polygon', django.contrib.gis.db.models.fields.MultiPolygonField(help_text='District polygon', srid=4326, null=True)),
            ],
        ),
    ]
