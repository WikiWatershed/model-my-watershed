# -*- coding: utf-8 -*-
from __future__ import (absolute_import,
                        division,
                        print_function,
                        unicode_literals)

from rest_framework.serializers import (CharField,
                                        DateTimeField,
                                        ListField,
                                        Serializer,
                                        )

from apps.bigcz.serializers import ResourceSerializer


class USGSVariableSetSerializer(Serializer):
    id = CharField()
    name = CharField()
    concept_keyword = CharField()
    site = CharField()
    wsdl = CharField()


class USGSResourceSerializer(ResourceSerializer):
    details_url = CharField()
    sample_mediums = ListField(child=CharField())
    variables = ListField(child=USGSVariableSetSerializer())
    service_org = CharField()
    service_orgname = CharField()
    service_code = CharField()
    service_url = CharField()
    monitoring_type = CharField()
    provider_name = CharField()
    service_title = CharField()
    service_citation = CharField()
    begin_date = DateTimeField()
    end_date = DateTimeField()
