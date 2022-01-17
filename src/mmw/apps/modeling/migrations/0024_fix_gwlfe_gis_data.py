# -*- coding: utf-8 -*-
from datetime import datetime

from django.db import migrations
from django.utils.timezone import make_aware


def fix_gis_data_serialization(apps, schema_editor):
    """
    Release 1.20.0 introduced a change which let the project "gis_data"
    field get updated by modifications on a scenario.  This effectively
    meant that modifications were being applied to all scenarios and that
    removing them did not actually remove their effect from the gwlf-e
    input.  For projects that were created and suffered from that bug,
    clearing out the gis_data on Project and the results on Scenario
    will force them to be recomputed with the fix applied.
    """

    Project = apps.get_model('modeling', 'Project')
    bug_released_date = make_aware(datetime.fromisoformat('2017-10-17'))

    # Apply fix to Multi-Year projects created after the release
    for project in Project.objects.filter(created_at__gte=bug_released_date,
                                          model_package='gwlfe'):
        project.gis_data = None
        for scenario in project.scenarios.all():
            scenario.results = None
            scenario.save()

        project.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0023_fix_gis_data_serialization'),
    ]

    operations = [
        migrations.RunPython(fix_gis_data_serialization,
                             migrations.RunPython.noop)
    ]
