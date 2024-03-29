# -*- coding: utf-8 -*-
# Generated by Django 1.11.22 on 2019-07-16 16:54
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('modeling', '0028_clear_old_mapshed_results'),
    ]

    operations = [
        migrations.AlterField(
            model_name='project',
            name='mapshed_job_uuid',
            field=models.ForeignKey(help_text='The job used to calculate the MapShed results. Used for getting the results of that job.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='mapshed_job', to='core.Job', to_field='uuid'),
        ),
        migrations.AlterField(
            model_name='project',
            name='subbasin_mapshed_job_uuid',
            field=models.ForeignKey(help_text='The job used to calculate the MapShed results for each HUC-12 sub-basin of the shape.', null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subbasin_mapshed_job', to='core.Job', to_field='uuid'),
        ),
        migrations.AlterField(
            model_name='project',
            name='user',
            field=models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, to=settings.AUTH_USER_MODEL),
        ),
    ]
