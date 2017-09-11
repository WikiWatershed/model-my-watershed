# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.db import models, migrations
from django.conf import settings
from django.contrib.auth.models import User
from rest_framework.authtoken.models import Token


def add_auth_tokens_to_users(apps, schema_editor):
    for user in User.objects.all():
        Token.objects.create(user=user)


class Migration(migrations.Migration):

    dependencies = [
        ('authtoken', '0001_initial'),
        ('user', '0001_initial')
    ]

    operations = [
        migrations.RunPython(add_auth_tokens_to_users)
    ]
