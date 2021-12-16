# -*- coding: utf-8 -*-
from django.urls import include, re_path
from django.contrib import admin
from django.conf import settings

from rest_framework import permissions
from drf_yasg.views import get_schema_view
from drf_yasg import openapi


admin.autodiscover()

apipatterns = [
    re_path(r'^api/', include('apps.geoprocessing_api.urls')),
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
    re_path(r'^', include('apps.home.urls')),
    re_path(r'^health-check/', include('apps.monitoring.urls')),
    re_path(r'^api-auth/', include('rest_framework.urls')),
    re_path(r'^accounts/', include('registration.backends.default.urls')),
    re_path(r'^bigcz/', include('apps.bigcz.urls')),
    re_path(r'^mmw/geocode/', include('apps.geocode.urls')),
    re_path(r'^mmw/modeling/', include('apps.modeling.urls')),
    re_path(r'^export/', include('apps.export.urls')),
    re_path(r'^api/docs/$', schema_view.with_ui('swagger', cache_timeout=0),
            name='schema-swagger-ui'),
    re_path(r'^api/', include('apps.geoprocessing_api.urls')),
    re_path(r'^micro/', include('apps.water_balance.urls')),
    re_path(r'^user/', include('apps.user.urls')),
    re_path(r'^admin/', admin.site.urls),
]
