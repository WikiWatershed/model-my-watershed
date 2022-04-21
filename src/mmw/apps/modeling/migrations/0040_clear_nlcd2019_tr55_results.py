# Generated by Django 3.2.13 on 2022-04-20 23:35

from django.db import migrations


def clear_nlcd2019_tr55_results(apps, schema_editor):
    """
    Clear the results For all scenarios belonging to TR-55 projects made after
    the release of 1.33.0, which switched NLCD19 2019 to be the default on
    2022-01-17:
    https://github.com/WikiWatershed/model-my-watershed/releases/tag/1.33.0

    These will be recalculated with NLCD11 2011 the next time it is opened.
    """
    Scenario = apps.get_model('modeling', 'Scenario')

    Scenario.objects.filter(
        project__model_package='tr-55',
        project__created_at__gte='2022-01-17'
    ).update(
        results='[]',
        modification_hash=''
    )


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0039_override_sedaadjust_for_old_scenarios'),
    ]

    operations = [
        migrations.RunPython(clear_nlcd2019_tr55_results)
    ]
