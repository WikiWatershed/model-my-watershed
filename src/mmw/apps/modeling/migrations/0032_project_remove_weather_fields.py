# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2020-04-21 04:42
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0031_scenario_add_weather_fields'),
    ]

    operations = [
        migrations.RemoveField(
            model_name='project',
            name='custom_weather_dataset',
        ),
        migrations.RemoveField(
            model_name='project',
            name='uses_custom_weather',
        ),
    ]
