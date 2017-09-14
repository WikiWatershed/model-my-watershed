# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import (CharField,
                                        DateTimeField,
                                        ListField,
                                        )

from apps.bigcz.serializers import ResourceSerializer


class CuahsiResourceSerializer(ResourceSerializer):
    details_url = CharField()
    sample_mediums = ListField(child=CharField())
    concept_keywords = ListField(child=CharField())
    service_org = CharField()
    service_code = CharField()
    service_url = CharField()
    begin_date = DateTimeField()
    end_date = DateTimeField()
