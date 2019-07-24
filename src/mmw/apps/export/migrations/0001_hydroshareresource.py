# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0026_delete_hydroshareresource'),
    ]

    operations = [
        migrations.CreateModel(
            name='HydroShareResource',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('resource', models.CharField(help_text='ID of Resource in HydroShare', max_length=63)),
                ('title', models.CharField(help_text='Title of Resource in HydroShare', max_length=255)),
                ('autosync', models.BooleanField(default=False, help_text='Whether to automatically push changes to HydroShare')),
                ('exported_at', models.DateTimeField(help_text='Most recent export date')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('modified_at', models.DateTimeField(auto_now=True)),
                ('project', models.OneToOneField(related_name='hydroshare', to='modeling.Project', on_delete=django.db.models.deletion.CASCADE)),
            ],
        ),
    ]
