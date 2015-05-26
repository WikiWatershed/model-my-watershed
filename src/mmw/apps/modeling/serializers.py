# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.auth.models import User
from rest_framework import serializers

from apps.modeling.models import Project, Scenario


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email')


class ScenarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Scenario


class ProjectSerializer(serializers.ModelSerializer):
    class Meta:
        model = Project
        depth = 1

    user = UserSerializer(default=serializers.CurrentUserDefault())
    scenarios = ScenarioSerializer(many=True, read_only=True)
