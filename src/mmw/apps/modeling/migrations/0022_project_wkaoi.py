# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0021_old_scenarios'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='wkaoi',
            field=models.CharField(help_text='Well-Known Area of Interest ID for faster geoprocessing', max_length=255, null=True),
        ),
    ]
