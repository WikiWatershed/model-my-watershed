# -*- coding: utf-8 -*-
from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0003_auto_20150526_1700')
    ]

    operations = [
        migrations.RenameField(
            model_name='district',
            old_name='polygon',
            new_name='geom',
        ),
    ]
