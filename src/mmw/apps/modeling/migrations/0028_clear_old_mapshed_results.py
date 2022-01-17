# -*- coding: utf-8 -*-
from django.db import migrations, models


def clear_old_mapshed_results(apps, schema_editor):
    Project = apps.get_model('modeling', 'Project')
    Scenario = apps.get_model('modeling', 'Scenario')

    Project.objects.filter(
        model_package='gwlfe'
    ).update(
        gis_data=None,
        mapshed_job_uuid=None,
        subbasin_mapshed_job_uuid=None
    )

    Scenario.objects.filter(
        project__model_package='gwlfe'
    ).update(
        results='[]',
        modification_hash=''
    )


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0027_project_add_mapshed_job_uuids'),
    ]

    operations = [
        migrations.RunPython(clear_old_mapshed_results)
    ]
