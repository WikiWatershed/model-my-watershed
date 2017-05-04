# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import patterns, include, url
from django.contrib import admin

import registration.backends.default.urls
import rest_framework.urls

import apps.bigcz.urls
import apps.geocode.urls
import apps.modeling.urls
import apps.home.urls
import apps.home.views
import apps.water_balance.urls
import apps.user.urls
import apps.monitoring.urls

admin.autodiscover()

urlpatterns = patterns(
    '',
    url(r'^', include(apps.home.urls)),
    url(r'^health-check/', include(apps.monitoring.urls)),
    url(r'^api-auth/', include(rest_framework.urls,
                               namespace='rest_framework')),
    url(r'^admin/', include(admin.site.urls)),
    url(r'^accounts/', include(registration.backends.default.urls)),
    url(r'^api/bigcz/', include(apps.bigcz.urls)),
    url(r'^api/geocode/', include(apps.geocode.urls)),
    url(r'^api/modeling/', include(apps.modeling.urls)),
    url(r'^micro/', include(apps.water_balance.urls)),
    url(r'^user/', include(apps.user.urls))
)
