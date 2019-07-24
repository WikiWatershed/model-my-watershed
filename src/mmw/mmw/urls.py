# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.conf.urls import include, url
from django.contrib import admin


admin.autodiscover()

urlpatterns = [
    url(r'^', include('apps.home.urls')),
    url(r'^health-check/', include('apps.monitoring.urls')),
    url(r'^api-auth/', include('rest_framework.urls')),
    url(r'^accounts/', include('registration.backends.default.urls')),
    url(r'^bigcz/', include('apps.bigcz.urls')),
    url(r'^mmw/geocode/', include('apps.geocode.urls')),
    url(r'^mmw/modeling/', include('apps.modeling.urls')),
    url(r'^export/', include('apps.export.urls')),
    url(r'^api/', include('apps.geoprocessing_api.urls')),
    url(r'^micro/', include('apps.water_balance.urls')),
    url(r'^user/', include('apps.user.urls')),
    url(r'^admin/', admin.site.urls),
]
