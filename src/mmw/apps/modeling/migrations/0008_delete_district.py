# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0007_scenario_census'),
    ]

    operations = [
        migrations.DeleteModel(
            name='District',
        ),
    ]
