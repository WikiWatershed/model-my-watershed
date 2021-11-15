# -*- coding: utf-8 -*-
from django.conf.urls import include, url
from django.contrib import admin
from django.conf import settings

from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi


admin.autodiscover()

apipatterns = [
    url(r'^api/', include('apps.geoprocessing_api.urls')),
]

schema_view = get_schema_view(
    openapi.Info(
        title='Model My Watershed API',
        default_version='v1',
        description=settings.SWAGGER_SETTINGS['MMW_API_DESCRIPTION'],
        license=openapi.License(name='Apache 2.0')
    ),
    public=True,
    permission_classes=(permissions.AllowAny,),
    patterns=apipatterns,
)

urlpatterns = [
    url(r'^', include('apps.home.urls')),
    url(r'^health-check/', include('apps.monitoring.urls')),
    url(r'^api-auth/', include('rest_framework.urls')),
    url(r'^accounts/', include('registration.backends.default.urls')),
    url(r'^bigcz/', include('apps.bigcz.urls')),
    url(r'^mmw/geocode/', include('apps.geocode.urls')),
    url(r'^mmw/modeling/', include('apps.modeling.urls')),
    url(r'^export/', include('apps.export.urls')),
    url(r'^api/docs/$', schema_view.with_ui('swagger', cache_timeout=0),
        name='schema-swagger-ui'),
    url(r'^api/', include('apps.geoprocessing_api.urls')),
    url(r'^micro/', include('apps.water_balance.urls')),
    url(r'^user/', include('apps.user.urls')),
    url(r'^admin/', admin.site.urls),
]
