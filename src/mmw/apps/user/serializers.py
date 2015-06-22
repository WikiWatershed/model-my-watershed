# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.auth.models import User
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'is_staff')
