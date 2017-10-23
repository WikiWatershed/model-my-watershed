# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import DateTimeField

from apps.bigcz.serializers import ResourceSerializer


class HydroshareResourceSerializer(ResourceSerializer):
    begin_date = DateTimeField()
    end_date = DateTimeField()
