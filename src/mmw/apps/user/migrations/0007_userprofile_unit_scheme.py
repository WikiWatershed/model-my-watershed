# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('user', '0006_userprofile_has_seen_hotspot_info'),
    ]

    operations = [
        migrations.AddField(
            model_name='userprofile',
            name='unit_scheme',
            field=models.TextField(default='METRIC', choices=[('METRIC', b'Metric'), ('USCUSTOMARY', b'US Customary')]),
        ),
    ]
