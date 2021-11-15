# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0006_auto_20150630_1320'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='census',
            field=models.TextField(help_text='Serialized JSON representation of geoprocessing results', null=True),
        ),
    ]
