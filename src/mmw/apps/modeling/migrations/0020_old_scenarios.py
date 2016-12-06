# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


def clear_old_scenario_results(apps, schema_editor):
    Scenario = apps.get_model('modeling', 'Scenario')
    old_scenarios = Scenario.objects.filter(
            project__model_package='tr-55'
        ).filter(
            results__contains='"result": {"pc_modified"'
        )

    for scenario in old_scenarios:
        scenario.results = '[]'
        scenario.modification_hash = ''
        scenario.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0019_project_gis_data'),
    ]

    operations = [
        migrations.RunPython(clear_old_scenario_results)
    ]
