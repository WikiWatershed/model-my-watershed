# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import url
from apps.monitoring.views import health_check

app_name = 'monitoring'
urlpatterns = [
    url(r'^$', health_check, name='health_check'),
]
