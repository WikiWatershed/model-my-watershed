# -*- coding: utf-8 -*-
# Generated by Django 1.11.29 on 2021-11-02 04:15
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0036_no_overrides_by_default'),
    ]

    # Add {'__STREAMS__': 'nhd'} to all layer_overrides
    operations = [
        migrations.RunSQL('''
            UPDATE modeling_project
            SET layer_overrides =
                layer_overrides::jsonb ||
                JSON_BUILD_OBJECT('__STREAMS__', 'nhd')::jsonb;
        ''')
    ]
