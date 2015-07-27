# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0011_project_null_aoi'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='is_activity',
            field=models.BooleanField(default=False, help_text='Projects with special properties'),
        )
    ]
