# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0005_auto_20150608_1502'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='inputs',
            field=models.TextField(help_text='Serialized JSON representation of scenario inputs', null=True),
        ),
        migrations.AlterField(
            model_name='scenario',
            name='modifications',
            field=models.TextField(help_text='Serialized JSON representation of scenarios modifications ', null=True),
        ),
    ]
