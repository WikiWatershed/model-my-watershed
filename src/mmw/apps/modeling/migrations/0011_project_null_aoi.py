# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
import django.contrib.gis.db.models.fields


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0010_scenario_inputmod_hash'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='area_of_interest',
            field=django.contrib.gis.db.models.fields.MultiPolygonField(help_text='Base geometry for all scenarios of project', srid=4326, null=True),
        )
    ]
