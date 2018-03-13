# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


# This model is being moved to apps.export instead

class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0025_hydroshareresource'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='hydroshareresource',
            name='project',
        ),
        migrations.DeleteModel(
            name='HydroShareResource',
        ),
    ]
