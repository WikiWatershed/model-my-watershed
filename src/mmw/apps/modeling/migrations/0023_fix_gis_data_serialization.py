# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import ast
import json

from django.db import migrations


def fix_gis_data_serialization(apps, schema_editor):
    Project = apps.get_model('modeling', 'Project')
    for project in Project.objects.all():
        if project.gis_data:
            # literal_eval works for both JSON and str(dict)
            # https://docs.python.org/2.7/library/ast.html#ast.literal_eval
            project.gis_data = json.dumps(ast.literal_eval(project.gis_data))
            project.save()


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0022_project_wkaoi'),
    ]

    operations = [
         migrations.RunPython(fix_gis_data_serialization,
                              migrations.RunPython.noop)
    ]
