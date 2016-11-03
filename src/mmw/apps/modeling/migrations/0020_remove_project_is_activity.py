# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0019_project_gis_data'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='is_activity',
        ),
    ]
