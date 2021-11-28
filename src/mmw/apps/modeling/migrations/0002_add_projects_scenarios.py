# -*- coding: utf-8 -*-
from django.db import models, migrations
from django.conf import settings
import django.contrib.gis.db.models.fields
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('modeling', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='Project',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=255)),
                ('area_of_interest', django.contrib.gis.db.models.fields.MultiPolygonField(help_text='Base geometry for all scenarios of project', srid=4326)),
                ('is_private', models.BooleanField(default=True)),
                ('model_package', models.CharField(help_text='Which model pack was chosen for this project', max_length=255, choices=[('tr-55', 'Simple Model')])),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('modified_at', models.DateTimeField(auto_now=True)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.PROTECT)),
            ],
        ),
        migrations.CreateModel(
            name='Scenario',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('name', models.CharField(max_length=255)),
                ('current_condition', models.BooleanField(default=False, help_text='A special type of scenario without modification abilities')),
                ('modifications', models.TextField(help_text='Serialized JSON representation of this scenarios applied modification, with respect to the model package', null=True)),
                ('modification_hash', models.CharField(help_text='A hash of the values for modifications & inputs to compare to the existing model results, to determine if the persisted result apply to the current values', max_length=255, null=True)),
                ('results', models.TextField(help_text='Serialized JSON representation of the model results', null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('modified_at', models.DateTimeField(auto_now=True)),
                ('project', models.ForeignKey(related_name='scenarios', to='modeling.Project', on_delete=django.db.models.deletion.CASCADE)),
            ],
        ),
        migrations.AlterUniqueTogether(
            name='scenario',
            unique_together=set([('name', 'project')]),
        ),
        migrations.AlterUniqueTogether(
            name='project',
            unique_together=set([('name', 'user')]),
        ),
    ]
