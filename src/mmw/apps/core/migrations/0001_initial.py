# -*- coding: utf-8 -*-
from django.db import models, migrations
from django.conf import settings
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='Job',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('uuid', models.UUIDField(null=True)),
                ('model_input', models.TextField()),
                ('created_at', models.DateTimeField()),
                ('result', models.TextField()),
                ('delivered_at', models.DateTimeField(null=True)),
                ('error', models.TextField()),
                ('traceback', models.TextField()),
                ('status', models.CharField(max_length=255)),
                ('user', models.ForeignKey(to=settings.AUTH_USER_MODEL, on_delete=django.db.models.deletion.SET_NULL, null=True)),
            ],
        ),
    ]
