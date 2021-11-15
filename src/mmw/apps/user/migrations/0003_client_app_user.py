# -*- coding: utf-8 -*-
from django.db import migrations
from django.conf import settings
from django.contrib.auth.models import User

def add_client_app_user(apps, schema_editor):
    web_app_user = User.objects.create_user(
        username=settings.CLIENT_APP_USERNAME,
        password=settings.CLIENT_APP_USER_PASSWORD)
    web_app_user.save()


def remove_client_app_user(apps, schema_editor):
    User.objects.filter(username=settings.CLIENT_APP_USERNAME).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('authtoken', '0001_initial'),
        ('user', '0001_initial'),
        ('user', '0002_auth_tokens')
    ]

    operations = [
        migrations.RunPython(add_client_app_user,
                             remove_client_app_user)
    ]
