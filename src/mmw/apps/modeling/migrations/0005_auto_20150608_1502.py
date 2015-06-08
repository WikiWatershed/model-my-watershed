# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0004_auto_20150529_1700'),
    ]

    operations = [
        migrations.AlterUniqueTogether(
            name='project',
            unique_together=set([]),
        ),
    ]
