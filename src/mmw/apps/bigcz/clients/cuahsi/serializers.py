# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import CharField

from apps.bigcz.serializers import ResourceSerializer


class CuahsiResourceSerializer(ResourceSerializer):
    test_field = CharField()
