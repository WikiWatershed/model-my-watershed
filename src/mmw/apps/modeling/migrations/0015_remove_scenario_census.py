# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0014_auto_20151005_0945'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='scenario',
            name='census',
        ),
    ]
