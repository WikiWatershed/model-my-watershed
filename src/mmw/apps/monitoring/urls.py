# -*- coding: utf-8 -*-
from django.urls import re_path
from apps.monitoring.views import health_check

app_name = 'monitoring'
urlpatterns = [
    re_path(r'^$', health_check, name='health_check'),
]
