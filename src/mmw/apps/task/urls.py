# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, url

from apps.task import views

urlpatterns = patterns(
    '',
    url(r'^start/tr55/$', views.start_tr55, name='start_tr55'),
)
