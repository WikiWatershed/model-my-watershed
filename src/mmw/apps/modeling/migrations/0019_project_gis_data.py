# -*- coding: utf-8 -*-
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0018_postgis_add_EPSG5070'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='gis_data',
            field=models.TextField(help_text='Serialized JSON representation of additional data gathering steps, such as MapShed.', null=True),
        ),
    ]
