# -*- coding: utf-8 -*-
from rest_framework.serializers import DateTimeField

from apps.bigcz.serializers import ResourceSerializer


class HydroshareResourceSerializer(ResourceSerializer):
    begin_date = DateTimeField()
    end_date = DateTimeField()
