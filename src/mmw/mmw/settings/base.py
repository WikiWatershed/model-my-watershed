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

from layer_settings import (LAYER_GROUPS, VIZER_URLS, VIZER_IGNORE, VIZER_NAMES,
                            NHD_REGION2_PERIMETER, DRB_PERIMETER, CONUS_PERIMETER)  # NOQA
from gwlfe_settings import (GWLFE_DEFAULTS, GWLFE_CONFIG, SOIL_GROUP, # NOQA
                            CURVE_NUMBER, NODATA)  # NOQA
from tr55_settings import (NLCD_MAPPING, SOIL_MAPPING)

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

# STACK COLOR CONFIGURATION
STACK_COLOR = environ.get('MMW_STACK_COLOR', 'Black')
# END STACK COLOR CONFIGURATION

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

CELERY_IMPORTS = ('celery.task.http',
                  # Submodule task is not always autodiscovered
                  'apps.modeling.mapshed.tasks',
                  )
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'djcelery.backends.cache:CacheBackend'
STATSD_CELERY_SIGNALS = True
CELERY_CREATE_MISSING_QUEUES = True
CELERY_CHORD_PROPAGATES = True
CELERY_CHORD_UNLOCK_MAX_RETRIES = 60
CELERY_DEFAULT_QUEUE = STACK_COLOR
CELERY_DEFAULT_ROUTING_KEY = "task.%s" % STACK_COLOR
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
    'mmw.context_processors.google_analytics_account',
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
    'rest_framework_swagger',
    'rest_framework.authtoken',
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

SWAGGER_SETTINGS = {
    'exclude_url_names': ['authtoken'],
    'exclude_namespaces': ['bigcz',
                           'mmw',
                           'user'],
    'doc_expansion': 'list',
    'info': {
        'description': 'The Model My Watershed API allows '
                       'you to delineate watersheds and analyze '
                       'geo-data for watersheds and arbitrary areas. '
                       'You can read more about the work at '
                       '<a href="http://www.wikiwatershed.org/">'
                       'WikiWatershed</a> '
                       'or use the <a href="https://www.app.wikiwatershed.org">'
                       'web app.',
        'license': 'Apache 2.0',
        'licenseUrl': 'http://www.apache.org/licenses/LICENSE-2.0.html',
        'title': 'Model My Watershed API',
    }
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
    'apps.bigcz',
    'apps.core',
    'apps.modeling',
    'apps.geoprocessing_api',
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

# Keep in sync with src/api/main.py in rapid-watershed-delineation.
MMW_MAX_AREA = 75000  # Max area in km2, about the size of West Virginia

BIGCZ_HOST = 'portal.bigcz.org'  # BiG-CZ Host, for enabling custom behavior
BIGCZ_MAX_AREA = 1500  # Max area in km2, limited by CUAHSI
BIGCZ_CLIENT_TIMEOUT = 5  # timeout in seconds
BIGCZ_CLIENT_PAGE_SIZE = 100

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

# Geoprocessing Settings
GEOP = {
    'cache': bool(int(environ.get('MMW_GEOPROCESSING_CACHE', 1))),
    'host': environ.get('MMW_GEOPROCESSING_HOST', 'localhost'),
    'port': environ.get('MMW_GEOPROCESSING_PORT', '8090'),
    'args': 'context=geoprocessing&appName=geoprocessing-%s&classPath=org.wikiwatershed.mmw.geoprocessing.MapshedJob' % environ.get('MMW_GEOPROCESSING_VERSION', '0.1.0'),  # NOQA
    'json': {
        'nlcd': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'nlcd-2011-30m-epsg5070-512-int8'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedCount',
                'zoom': 0
            }
        },
        'soil': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'ssurgo-hydro-groups-30m-epsg5070-512-int8'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedCount',
                'zoom': 0
            }
        },
        'nlcd_soil': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'nlcd-2011-30m-epsg5070-512-int8',
                    'ssurgo-hydro-groups-30m-epsg5070-512-int8'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedCount',
                'zoom': 0
            }
        },
        'nlcd_streams': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'vector': [],
                'vectorCRS': 'LatLng',
                'rasters': [
                    'nlcd-2011-30m-epsg5070-512-int8'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterLinesJoin',
                'zoom': 0
            }
        },
        'gwn': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'us-groundwater-nitrogen-30m-epsg5070-512'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedCount',
                'zoom': 0
            }
        },
        'avg_awc': {
            'input': {
                'polygon': [],
                'targetRaster': 'us-ssurgo-aws100-30m-epsg5070-512',
                'rasters': [],
                'rasterCRS': 'ConusAlbers',
                'polygonCRS': 'LatLng',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'nlcd_slope': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'nlcd-2011-30m-epsg5070-512-int8',
                    'us-percent-slope-30m-epsg5070-512'
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedCount',
                'zoom': 0
            }
        },
        'slope': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'us-percent-slope-30m-epsg5070-512',
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'nlcd_kfactor': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'nlcd-2011-30m-epsg5070-512-int8'
                ],
                'targetRaster': 'us-ssugro-kfactor-30m-epsg5070-512',
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'ppt': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'climatology-ppt-{:02d}-epsg5070',
                'pixelIsArea': True,
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'tmean': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'climatology-tmean-{:02d}-epsg5070',
                'pixelIsArea': True,
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'soiln': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'soiln-epsg5070',
                'pixelIsArea': True,
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'soilp': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'soilpallland2-epsg5070',
                'pixelIsArea': True,
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        },
        'recess_coef': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [],
                'targetRaster': 'bfi48grd-epsg5070',
                'pixelIsArea': True,
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterGroupedAverage',
                'zoom': 0
            }
        }
    }
}

# TILER CONFIGURATION
TILER_HOST = environ.get('MMW_TILER_HOST', 'localhost')
# END TILER CONFIGURATION

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
    'SidebarToggleControl',
]

GWLFE = 'gwlfe'
TR55_PACKAGE = 'tr-55'

MODEL_PACKAGES = [
    {
        'name': TR55_PACKAGE,
        'display_name': 'Site Storm Model',
        'description': 'Simulates a hypothetical 24-hour storm by a hybrid of '
                       'SLAMM, TR-55, and EPA\'s STEP-L model algorithms. '
                       'Designed primarily for use with smaller, more '
                       'developed areas.',
        'help_link': 'https://wikiwatershed.org/documentation/mmw-tech/#site-storm-model',
    },
    {
        'name': GWLFE,
        'display_name': 'Watershed Multi-Year Model',
        'description': 'Simulates 30-years of daily data by the GWLF-E '
                       '(MapShed) model. Designed primarily for use with '
                       'larger, more rural areas.',
        'help_link': 'https://wikiwatershed.org/documentation/mmw-tech/#watershed-multi-year-model',
    },
]

DISABLED_MODEL_PACKAGES = []

# END UI CONFIGURATION
