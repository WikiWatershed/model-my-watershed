# -*- coding: utf-8 -*-
from django.conf.urls import url
from apps.monitoring.views import health_check

app_name = 'monitoring'
urlpatterns = [
    url(r'^$', health_check, name='health_check'),
]
