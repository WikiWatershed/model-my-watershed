# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from rest_framework.serializers import (CharField,
                                        ListField,
                                        DateTimeField)

from apps.bigcz.serializers import ResourceSerializer


class CinergiResourceSerializer(ResourceSerializer):
    cinergi_url = CharField()
    source_name = CharField()
    contact_organizations = ListField(
        child=CharField()
    )
    categories = ListField(
        child=CharField()
    )
    begin_date = DateTimeField()
    end_date = DateTimeField()
