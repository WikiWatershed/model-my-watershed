# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
from django.conf import settings
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('auth', '0006_require_contenttypes_0002'),
        ('user', '0004_userprofile'),
    ]

    operations = [
        migrations.CreateModel(
            name='HydroShareToken',
            fields=[
                ('user', models.OneToOneField(primary_key=True, serialize=False, to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.CASCADE)),
                ('access_token', models.CharField(max_length=255)),
                ('token_type', models.CharField(default=b'Bearer', max_length=255)),
                ('expires_in', models.IntegerField(default=0)),
                ('refresh_token', models.CharField(max_length=255)),
                ('scope', models.CharField(default=b'read write', max_length=255)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('modified_at', models.DateTimeField(auto_now=True)),
            ],
        ),
    ]
