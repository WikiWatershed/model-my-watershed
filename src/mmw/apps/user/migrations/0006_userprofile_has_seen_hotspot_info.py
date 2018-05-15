# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0005_hydrosharetoken'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='has_seen_hotspot_info',
            field=models.BooleanField(default=False),
        ),
    ]
