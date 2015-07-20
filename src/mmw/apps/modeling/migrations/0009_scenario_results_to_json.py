# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations


def clear_results_with_u_prefix(apps, schema_editor):
    Scenario = apps.get_model('modeling', 'Scenario')
    for scenario in Scenario.objects.filter(results__contains="[{u'"):
        scenario.results = "[]"
        scenario.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0008_delete_district'),
    ]

    # https://docs.djangoproject.com/en/1.8/topics/migrations/#data-migrations
    operations = [
        migrations.RunPython(clear_results_with_u_prefix)
    ]
