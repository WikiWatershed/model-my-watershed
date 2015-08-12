# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0012_project_activity_flag'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='area_of_interest_name',
            field=models.CharField(help_text='A human name for the area of interest', max_length=255, null=True),
        ),
    ]
