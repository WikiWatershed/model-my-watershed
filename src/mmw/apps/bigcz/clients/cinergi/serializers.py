# -*- coding: utf-8 -*-
from rest_framework.serializers import (CharField,
                                        ListField,
                                        DateTimeField,
                                        Serializer)

from apps.bigcz.serializers import ResourceSerializer


class CinergiWebResourceSerializer(Serializer):
    url_type = CharField()
    url = CharField()


class CinergiWebServiceSerializer(Serializer):
    url_type = CharField()
    url_name = CharField()
    url = CharField()


class CinergiResourceSerializer(ResourceSerializer):
    cinergi_url = CharField()
    source_name = CharField()
    contact_organizations = ListField(
        child=CharField()
    )
    contact_people = ListField(
        child=CharField()
    )
    categories = ListField(
        child=CharField()
    )
    begin_date = DateTimeField()
    end_date = DateTimeField()
    resource_type = CharField()
    resource_topic_categories = ListField(
        child=CharField()
    )
    web_resources = ListField(
        child=CinergiWebResourceSerializer()
    )
    web_services = ListField(
        child=CinergiWebServiceSerializer()
    )
