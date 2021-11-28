# -*- coding: utf-8 -*-
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_job_uuid_unique_constraint'),
        ('modeling', '0026_delete_hydroshareresource'),
    ]

    operations = [
        migrations.AddField(
            model_name='project',
            name='mapshed_job_uuid',
            field=models.ForeignKey(related_name='mapshed_job', to_field='uuid', to='core.Job', on_delete=django.db.models.deletion.SET_NULL, help_text='The job used to calculate the MapShed results. Used for getting the results of that job.', null=True),
        ),
        migrations.AddField(
            model_name='project',
            name='subbasin_mapshed_job_uuid',
            field=models.ForeignKey(related_name='subbasin_mapshed_job', to_field='uuid', to='core.Job', on_delete=django.db.models.deletion.SET_NULL, help_text='The job used to calculate the MapShed results for each HUC-12 sub-basin of the shape.', null=True),
        ),
    ]
