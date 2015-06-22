# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0002_add_projects_scenarios'),
    ]

    operations = [
        migrations.RenameField(
            model_name='scenario',
            old_name='current_condition',
            new_name='is_current_conditions',
        ),
    ]
