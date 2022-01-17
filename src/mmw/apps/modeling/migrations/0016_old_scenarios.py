# -*- coding: utf-8 -*-
from django.db import models, migrations


def clear_old_scenario_results(apps, schema_editor):
    Scenario = apps.get_model('modeling', 'Scenario')
    for scenario in Scenario.objects.all():
        if 'pc_modified' not in scenario.results or 'pc_unmodified' not in scenario.results:
            scenario.results = "[]"
            scenario.modification_hash = ""
            scenario.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0015_remove_scenario_census'),
    ]

    operations = [
        migrations.RunPython(clear_old_scenario_results)
    ]
