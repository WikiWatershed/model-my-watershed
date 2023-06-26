"""
Django settings for model_my_watershed project.

For more information on this file, see
https://docs.djangoproject.com/en/1.7/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.7/ref/settings/
"""

import os

from boto.utils import get_instance_metadata

from mmw.settings.base import *  # NOQA


instance_metadata = get_instance_metadata(timeout=5)

if not instance_metadata:
    raise ImproperlyConfigured('Unable to access the instance metadata')


# HOST CONFIGURATION
# See: https://docs.djangoproject.com/en/1.5/releases/1.5/#allowed-hosts-required-in-production  # NOQA
ALLOWED_HOSTS = [
    'modelmywatershed.org',
    'staging.modelmywatershed.org',
    'app.wikiwatershed.org',
    'staging.app.wikiwatershed.org',
    'portal.bigcz.org',
    'staging.portal.bigcz.org',
    '.elb.amazonaws.com',
    'localhost'
]

# ELBs use the instance IP in the Host header and ALLOWED_HOSTS checks against
# the Host header.
ALLOWED_HOSTS.append(instance_metadata['local-ipv4'])
# END HOST CONFIGURATION

# FILE STORAGE CONFIGURATION
DEFAULT_FILE_STORAGE = 'storages.backends.s3boto3.S3Boto3Storage'
AWS_STORAGE_BUCKET_NAME = 'mmw-{}-data-us-east-1'.format('production' if get_env_setting('MMW_STACK_TYPE') == 'Production' else 'staging')
AWS_DEFAULT_ACL = None
# END FILE STORAGE CONFIGURATION

# EMAIL CONFIGURATION
EMAIL_BACKEND = 'apps.core.mail.backends.boto_ses_mailer.EmailBackend'
EMAIL_BOTO_CHECK_QUOTA = False
DEFAULT_FROM_EMAIL = 'noreply@modelmywatershed.org'
# END EMAIL CONFIGURATION

# MIDDLEWARE CONFIGURATION
MIDDLEWARE += (
    'rollbar.contrib.django.middleware.RollbarNotifierMiddleware',
)
# END MIDDLEWARE CONFIGURATION

# ROLLBAR CONFIGURATION
ROLLBAR = {
    'access_token': get_env_setting('ROLLBAR_SERVER_SIDE_ACCESS_TOKEN'),
    'environment': get_env_setting('MMW_STACK_TYPE'),
    'root': os.getcwd(),
}
# END ROLLBAR CONFIGURATION

# Turn off DRF GUI
REST_FRAMEWORK.update({
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    )
})

# UI CONFIGURATION

DRAW_TOOLS = [
    'SelectArea',   # Boundary Selector
    'Draw',         # Custom Area or 1 Sq Km stamp
    'PlaceMarker',  # Delineate Watershed
    'ResetDraw',
]

MAP_CONTROLS = [
    'LayerAttribution',
    'LayerSelector',
    'LocateMeButton',
    'ZoomControl',
    'FitToAoiControl',
    'SidebarToggleControl',
]

DISABLED_MODEL_PACKAGES = []

# END UI CONFIGURATION

# Google API key for production deployment
GOOGLE_MAPS_API_KEY = 'AIzaSyCXdkywU7rps_i1CeKqWxlBi97vyGeXsqk'

# Stroud account
GOOGLE_ANALYTICS_ACCOUNT = 'G-R98FWXKCFY'

# django-cookies-samesite
SESSION_COOKIE_SAMESITE = 'None'  # Allows for cross site embedding into LARA
SESSION_COOKIE_SECURE = True      # Only set cookies in HTTPS connections

# CSRF
CSRF_TRUSTED_ORIGINS = [
    '.modelmywatershed.org',
    '.concord.org'
]

CSRF_COOKIE_SAMESITE = 'None'  # Allow for embedding into Concord
CSRF_COOKIE_SECURE = True      # Only set cookies in HTTPS connections
