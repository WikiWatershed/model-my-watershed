# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0009_scenario_results_to_json'),
    ]

    operations = [
        migrations.AddField(
            model_name='scenario',
            name='inputmod_hash',
            field=models.CharField(help_text='A hash of the values for inputs & modifications to compare to the existing model results, to determine if the persisted result apply to the current values', max_length=255, null=True),
        ),
        migrations.AlterField(
            model_name='scenario',
            name='modification_hash',
            field=models.CharField(help_text='A hash of the values for modifications to compare to the existing model results, to determine if the persisted result apply to the current values', max_length=255, null=True),
        ),
    ]
