# -*- coding: utf-8 -*-
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_requestlog_api_referrer'),
    ]

    operations = [
        migrations.AlterField(
            model_name='job',
            name='uuid',
            field=models.UUIDField(unique=True, null=True),
        ),
    ]
