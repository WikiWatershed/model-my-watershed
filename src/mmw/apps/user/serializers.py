# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.auth.models import User
from models import UserProfile, HydroShareToken
from rest_framework import serializers


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'is_staff')


class UserProfileSerializer(serializers.Serializer):
    user_id = serializers.IntegerField(required=True)
    organization = serializers.CharField(required=False, allow_blank=True)
    user_type = serializers.CharField(required=False, allow_blank=True)
    postal_code = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=False, allow_blank=True)
    last_name = serializers.CharField(required=False, allow_blank=True)
    was_skipped = serializers.BooleanField(required=False)
    is_complete = serializers.BooleanField(required=True)
    has_seen_hotspot_info = serializers.BooleanField(required=False)

    def create(self, validated_data):
        user_id = validated_data.get('user_id', None)
        if user_id is not None:
            user = User.objects.filter(id=user_id).first()
            if user is not None:
                if 'first_name' in validated_data:
                    user.first_name = validated_data['first_name']
                    del validated_data['first_name']
                if 'last_name' in validated_data:
                    user.last_name = validated_data['last_name']
                    del validated_data['last_name']
                user.save()
                profile, created = UserProfile.objects.update_or_create(
                    user_id=user_id,
                    defaults=validated_data)
                return profile


class HydroShareTokenSerializer(serializers.ModelSerializer):
    class Meta:
        model = HydroShareToken
