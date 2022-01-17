# -*- coding: utf-8 -*-
from django.db import migrations, models
import django.db.models.deletion
from django.conf import settings


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('core', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='RequestLog',
            fields=[
                ('id', models.AutoField(verbose_name='ID', serialize=False, auto_created=True, primary_key=True)),
                ('job_uuid', models.UUIDField(help_text='If async request, the uuid of the submitted job', null=True)),
                ('requested_at', models.DateTimeField(help_text='When the request was made')),
                ('response_ms', models.PositiveIntegerField(help_text='How long the response took in ms')),
                ('path', models.CharField(help_text='The requested URI', max_length=400)),
                ('query_params', models.TextField(help_text='Stringified requested query params dictionary', null=True)),
                ('status_code', models.PositiveIntegerField(help_text='HTTP status code sent back')),
                ('method', models.CharField(help_text='HTTP method', max_length=255)),
                ('host', models.URLField(help_text='The host from which the request was sent')),
                ('remote_addr', models.GenericIPAddressField(help_text='The IP address from which the request was sent')),
                ('user', models.ForeignKey(on_delete=django.db.models.deletion.SET_NULL, to=settings.AUTH_USER_MODEL, null=True)),
            ],
        ),
    ]
