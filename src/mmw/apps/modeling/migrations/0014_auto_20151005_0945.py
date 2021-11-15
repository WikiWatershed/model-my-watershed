# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0013_project_area_of_interest_name'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='aoi_census',
            field=models.TextField(help_text='Serialized JSON representation of AoI census geoprocessing results', null=True),
        ),
        migrations.AddField(
            model_name='scenario',
            name='modification_censuses',
            field=models.TextField(help_text='Serialized JSON representation of modification censuses geoprocessing results, with modification_hash', null=True),
        ),
    ]
