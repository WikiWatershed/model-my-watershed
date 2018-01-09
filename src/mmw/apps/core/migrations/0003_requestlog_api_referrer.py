# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_requestlog'),
    ]

    operations = [
        migrations.AddField(
            model_name='requestlog',
            name='api',
            field=models.BooleanField(default=True, help_text='Whether this was an API call (true) or MMW UI call (false)'),
        ),
        migrations.AddField(
            model_name='requestlog',
            name='referrer',
            field=models.CharField(help_text='The referrer from which the request was sent', max_length=400, null=True),
        ),
    ]
