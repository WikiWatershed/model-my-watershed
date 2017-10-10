# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import (CharField,
                                        DateTimeField,
                                        ListField,
                                        Serializer,
                                        )

from apps.bigcz.serializers import ResourceSerializer


class CuahsiVariableSetSerializer(Serializer):
    id = CharField()
    name = CharField()
    concept_keyword = CharField()
    site = CharField()
    wsdl = CharField()


class CuahsiResourceSerializer(ResourceSerializer):
    details_url = CharField()
    sample_mediums = ListField(child=CharField())
    variables = ListField(child=CuahsiVariableSetSerializer())
    service_org = CharField()
    service_code = CharField()
    service_url = CharField()
    service_title = CharField()
    service_citation = CharField()
    begin_date = DateTimeField()
    end_date = DateTimeField()
