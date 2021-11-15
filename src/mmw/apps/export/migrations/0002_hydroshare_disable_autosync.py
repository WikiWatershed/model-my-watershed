# -*- coding: utf-8 -*-
from django.db import migrations, models


def disable_hydroshare_autosync(apps, schema_editor):
    HydroShareResource = apps.get_model('export', 'HydroShareResource')
    HydroShareResource.objects.all().update(autosync=False)


class Migration(migrations.Migration):

    dependencies = [
        ('export', '0001_hydroshareresource'),
    ]

    operations = [
        migrations.RunPython(disable_hydroshare_autosync)
    ]
