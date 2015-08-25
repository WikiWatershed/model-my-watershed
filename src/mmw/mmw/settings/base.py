"""
Django settings for model_my_watershed project.

For more information on this file, see
https://docs.djangoproject.com/en/1.7/topics/settings/

For the full list of settings and their values, see
https://docs.djangoproject.com/en/1.7/ref/settings/
"""

from os import environ
from os.path import abspath, basename, dirname, join, normpath
from sys import path

# Normally you should not import ANYTHING from Django directly
# into your settings, but ImproperlyConfigured is an exception.
from django.core.exceptions import ImproperlyConfigured

from omgeo import postprocessors


def get_env_setting(setting):
    """ Get the environment setting or return exception """
    try:
        return environ[setting]
    except KeyError:
        error_msg = "Set the %s env variable" % setting
        raise ImproperlyConfigured(error_msg)


# PATH CONFIGURATION
DJANGO_ROOT = dirname(dirname(abspath(__file__)))

# Absolute filesystem path to the top-level folder:
SITE_ROOT = dirname(DJANGO_ROOT)

# Site name:
SITE_NAME = basename(DJANGO_ROOT)

# Add our project to our pythonpath, this way we don't need to type our project
# name in our dotted import paths:
path.append(DJANGO_ROOT)
# END PATH CONFIGURATION


# DEBUG CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#debug
DEBUG = False

# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-debug
TEMPLATE_DEBUG = DEBUG
# END DEBUG CONFIGURATION


# FILE STORAGE CONFIGURATION
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
# END FILE STORAGE CONFIGURATION


# STATSD CONFIGURATION
STATSD_CLIENT = 'django_statsd.clients.normal'
STATSD_PREFIX = 'django'
STATSD_HOST = environ.get('MMW_STATSD_HOST', 'localhost')
# END STATSD CONFIGURATION


# CACHE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#caches
CACHES = {
    'default': {
        # The Redis database at index 0 is used by Logstash/Beaver
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': 'redis://{0}:{1}/1'.format(
            environ.get('MMW_CACHE_HOST', 'localhost'),
            environ.get('MMW_CACHE_PORT', 6379)),
        'OPTIONS': {
            'PARSER_CLASS': 'redis.connection.HiredisParser',
            'SOCKET_TIMEOUT': 3,
        }
    }
}

# Don't throw exceptions if Redis is down.
DJANGO_REDIS_IGNORE_EXCEPTIONS = True
# END CACHE CONFIGURATION


# DATABASE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#databases
DATABASES = {
    'default': {
        'ENGINE': 'django.contrib.gis.db.backends.postgis',
        'NAME': environ.get('MMW_DB_NAME', 'mmw'),
        'USER': environ.get('MMW_DB_USER', 'mmw'),
        'PASSWORD': environ.get('MMW_DB_PASSWORD', 'mmw'),
        'HOST': environ.get('MMW_DB_HOST', 'localhost'),
        'PORT': environ.get('MMW_DB_PORT', 5432),
        'TEST_NAME': environ.get('DJANGO_TEST_DB_NAME', 'test_mmw')
    }
}

POSTGIS_VERSION = tuple(
    map(int, environ.get('DJANGO_POSTGIS_VERSION', '2.1.3').split("."))
)
# END DATABASE CONFIGURATION


# CELERY CONFIGURATION
BROKER_URL = 'redis://{0}:{1}/2'.format(
    environ.get('MMW_CACHE_HOST', 'localhost'),
    environ.get('MMW_CACHE_PORT', 6379))

CELERY_IMPORTS = ('celery.task.http',)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'djcelery.backends.cache:CacheBackend'
STATSD_CELERY_SIGNALS = True
CELERY_DEFAULT_QUEUE = environ.get('MMW_STACK_COLOR', 'Black').lower()
CELERY_DEFAULT_ROUTING_KEY = 'task.%s' % environ.get('MMW_STACK_COLOR', 'Black').lower()
# END CELERY CONFIGURATION


# LOGGING CONFIGURATION
LOGGING = {
    'version': 1,
    'disable_existing_loggers': True,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'INFO',
        },
    }
}
# END LOGGING CONFIGURATION


# GENERAL CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#time-zone
TIME_ZONE = 'America/New_York'

# See: https://docs.djangoproject.com/en/dev/ref/settings/#language-code
LANGUAGE_CODE = 'en-us'

# See: https://docs.djangoproject.com/en/dev/ref/settings/#use-i18n
USE_I18N = False

# See: https://docs.djangoproject.com/en/dev/ref/settings/#use-l10n
USE_L10N = False

# See: https://docs.djangoproject.com/en/dev/ref/settings/#use-tz
USE_TZ = True

# This generates false positives and is being removed
# (https://code.djangoproject.com/ticket/23469)
SILENCED_SYSTEM_CHECKS = ['1_6.W001', '1_6.W002']
# END GENERAL CONFIGURATION


# MEDIA CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#media-root
MEDIA_ROOT = environ['DJANGO_MEDIA_ROOT']

# See: https://docs.djangoproject.com/en/dev/ref/settings/#media-url
MEDIA_URL = '/media/'
# END MEDIA CONFIGURATION


# STATIC FILE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#static-root
STATIC_ROOT = environ['DJANGO_STATIC_ROOT']

# See: https://docs.djangoproject.com/en/dev/ref/settings/#static-url
STATIC_URL = '/static/'

# See: https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#std:setting-STATICFILES_DIRS  # NOQA
STATICFILES_DIR = '/var/cache/mmw/static/'
STATICFILES_DIRS = (
    STATICFILES_DIR,
)

# See: https://docs.djangoproject.com/en/dev/ref/contrib/staticfiles/#staticfiles-finders  # NOQA
STATICFILES_FINDERS = (
    'django.contrib.staticfiles.finders.FileSystemFinder',
    'django.contrib.staticfiles.finders.AppDirectoriesFinder',
)

# SECRET CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#secret-key
# Note: This key should only be used for development and testing.
SECRET_KEY = get_env_setting('DJANGO_SECRET_KEY')
# END SECRET CONFIGURATION


# SITE CONFIGURATION
# Hosts/domain names that are valid for this site
# See https://docs.djangoproject.com/en/1.5/ref/settings/#allowed-hosts
ALLOWED_HOSTS = []
# END SITE CONFIGURATION


# FIXTURE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#std:setting-FIXTURE_DIRS  # NOQA
FIXTURE_DIRS = (
    normpath(join(SITE_ROOT, 'fixtures')),
)
# END FIXTURE CONFIGURATION


# TEMPLATE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-context-processors  # NOQA
TEMPLATE_CONTEXT_PROCESSORS = (
    'django.contrib.auth.context_processors.auth',
    'django.core.context_processors.debug',
    'django.core.context_processors.media',
    'django.core.context_processors.static',
    'django.core.context_processors.tz',
    'django.contrib.messages.context_processors.messages',
    'django.core.context_processors.request',
)

# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-loaders
TEMPLATE_LOADERS = (
    'django.template.loaders.filesystem.Loader',
    'django.template.loaders.app_directories.Loader',
)

# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-dirs
TEMPLATE_DIRS = (
    normpath(join(SITE_ROOT, 'templates')),
)
# END TEMPLATE CONFIGURATION


# MIDDLEWARE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#middleware-classes
MIDDLEWARE_CLASSES = (
    # Default Django middleware.
    'django.middleware.common.CommonMiddleware',
    'mmw.middleware.BypassMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django_statsd.middleware.GraphiteRequestTimingMiddleware',
    'django_statsd.middleware.GraphiteMiddleware',
    'apps.user.middleware.ItsiAuthenticationMiddleware',
)
# END MIDDLEWARE CONFIGURATION


# URL CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#root-urlconf
ROOT_URLCONF = '%s.urls' % SITE_NAME
# END URL CONFIGURATION


# TILER CONFIGURATION
TILER_HOST = environ.get('MMW_TILER_HOST', 'localhost')
# END TILER CONFIGURATION


# N. B. This must be kept in sync with src/tiler/server.js.  In the
# dictionary below, the keys are the table ids.  If `json_field` is provided
# that column will be used for feature lookups, but default to 'geom' if not.
BOUNDARY_LAYERS = [
    {
        'code': 'district',
        'display': 'Congressional Districts',
        'short_display': 'Congressional District',
        'table_name': 'boundary_district'
    },
    {
        'code': 'huc8',
        'display': 'USGS Subbasin unit (HUC-8)',
        'short_display': 'Subbasin',
        'table_name': 'boundary_huc08'
    },
    {
        'code': 'huc10',
        'display': 'USGS Watershed unit (HUC-10)',
        'short_display': 'Watershed',
        'table_name': 'boundary_huc10'
    },
    {
        'code': 'huc12',
        'display': 'USGS Subwatershed unit (HUC-12)',
        'short_display': 'Subwatershed',
        'table_name': 'boundary_huc12',
        'json_field': 'geom_detailed'
    }
]

STREAM_LAYERS = [
    {
        'code': 'stream-low',
        'display': 'Low-Res',
        'table_name': 'deldem4net100r',
    },
    {
        'code': 'stream-medium',
        'display': 'Medium-Res',
        'table_name': 'deldem4net50r',
    },
    {
        'code': 'stream-high',
        'display': 'High-Res',
        'table_name': 'deldem4net20r',
    },
]

# END TILER CONFIGURATION

# APP CONFIGURATION
DJANGO_APPS = (
    # Default Django apps:
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.gis',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'django.contrib.humanize',
    'django.contrib.admin',
)

THIRD_PARTY_APPS = (
    'rest_framework',
    'registration',
)

# THIRD-PARTY CONFIGURATION

# rest_framework
REST_FRAMEWORK = {
    # Use Django's standard `django.contrib.auth` permissions,
    # or allow read-only access for unauthenticated users.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.DjangoModelPermissionsOrAnonReadOnly'
    ]
}

# registration
ACCOUNT_ACTIVATION_DAYS = 7  # One-week activation window.

# Add custom authentication classes
AUTHENTICATION_BACKENDS = (
    'django.contrib.auth.backends.ModelBackend',
    'apps.user.backends.ItsiAuthenticationBackend',
)

# END THIRD-PARTY CONFIGURATION

# Apps specific for this project go here.
LOCAL_APPS = (
    'apps.core',
    'apps.modeling',
    'apps.home',
    'apps.geocode',
    'apps.water_balance',
    'apps.user'
)

# See: https://docs.djangoproject.com/en/dev/ref/settings/#installed-apps
INSTALLED_APPS = DJANGO_APPS + THIRD_PARTY_APPS + LOCAL_APPS
# END APP CONFIGURATION


# WSGI CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#wsgi-application
WSGI_APPLICATION = '%s.wsgi.application' % SITE_NAME
# END WSGI CONFIGURATION

OMGEO_SETTINGS = [[
    'omgeo.services.EsriWGSSSL',
    {
        'preprocessors': [],
        'postprocessors': [
            postprocessors.UseHighScoreIfAtLeast(99),
            postprocessors.DupePicker(
                attr_dupes='match_addr',
                attr_sort='locator_type',
                ordered_list=['PointAddress', 'BuildingName', 'StreetAddress']
            ),
            postprocessors.ScoreSorter(),
            postprocessors.GroupBy('match_addr'),
            postprocessors.GroupBy(('x', 'y')),
            postprocessors.SnapPoints(distance=10)
        ]
    }
]]

# ITSI Portal Settings
ITSI = {
    'client_id': environ.get('MMW_ITSI_CLIENT_ID', 'model-my-watershed'),
    'client_secret': environ.get('MMW_ITSI_SECRET_KEY', 'itsi_secret_key'),
    'base_url': environ.get('MMW_ITSI_BASE_URL',
                            'http://learn.staging.concord.org/'),
    'authorize_url': 'auth/concord_id/authorize',
    'access_token_url': 'auth/concord_id/access_token',
    'user_json_url': 'auth/concord_id/user.json',
    'embed_flag': 'itsi_embed',
}

# Layers must have a maxZoom defined
BASE_LAYERS = {
    'Streets': {
        'type': 'mapbox',
        'url': 'https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png',
        'attribution': 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery &copy; <a href="http://mapbox.com">Mapbox</a>',
        'maxZoom': 18,
        'default': True,
    },
    'Satellite': {
        'type': 'esri',
        'url': 'https://server.arcgisonline.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        'attribution': 'Map data from <a href="http://www.arcgis.com/home/item.html?id=10df2279f9684e4a9f6a7f08febac2a9">ESRI</a>',
        'maxZoom': 19
    },
    'Satellite with Roads': {
        'type': 'google',
        'googleType': 'HYBRID', # can be one of SATELLITE, ROADMAP, HYBRID, TERRAIN,
        'maxZoom': 18 # Max zoom changes based on available imagery, but this is a safe default
    },
    'Terrain': {
        'type': 'google',
        'googleType': 'TERRAIN', # can be one of SATELLITE, ROADMAP, HYBRID, TERRAIN,
        'maxZoom': 20
    }
}
