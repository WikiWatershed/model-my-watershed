# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework import serializers

from models import HydroShareResource


class HydroShareResourceSerializer(serializers.ModelSerializer):

    class Meta:
        model = HydroShareResource

    url = serializers.ReadOnlyField()
