# -*- coding: utf-8 -*-
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
                            DRB_PERIMETER, DRB_SIMPLE_PERIMETER,
                            NHD_REGION2_PERIMETER, CONUS_PERIMETER)  # NOQA
from gwlfe_settings import (GWLFE_DEFAULTS, GWLFE_CONFIG, SOIL_GROUP, # NOQA
                            CURVE_NUMBER, NODATA, SRAT_KEYS, SUBBASIN_SOURCE_NORMALIZING_AREAS)  # NOQA
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
# END DEBUG CONFIGURATION


# FILE STORAGE CONFIGURATION
DEFAULT_FILE_STORAGE = 'django.core.files.storage.FileSystemStorage'
# END FILE STORAGE CONFIGURATION

# STACK COLOR CONFIGURATION
STACK_COLOR = environ.get('MMW_STACK_COLOR', 'Black')
# END STACK COLOR CONFIGURATION

# CACHE CONFIGURATION
# See: https://docs.djangoproject.com/en/dev/ref/settings/#caches
CACHES = {
    'default': {
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
    map(int, environ.get('DJANGO_POSTGIS_VERSION', '2.3.7').split("."))
)
# END DATABASE CONFIGURATION


# CELERY CONFIGURATION
CELERY_BROKER_URL = 'redis://{0}:{1}/2'.format(
    environ.get('MMW_CACHE_HOST', 'localhost'),
    environ.get('MMW_CACHE_PORT', 6379))

CELERY_IMPORTS = (
    # Submodule task is not always autodiscovered
    'apps.modeling.mapshed.tasks',
)
CELERY_ACCEPT_CONTENT = ['json']
CELERY_TASK_SERIALIZER = 'json'
CELERY_RESULT_SERIALIZER = 'json'
CELERY_RESULT_BACKEND = 'django-cache'
CELERY_CREATE_MISSING_QUEUES = True
CELERY_CHORD_PROPAGATES = True
CELERY_TASK_DEFAULT_QUEUE = STACK_COLOR
CELERY_TASK_QUEUES = {
    STACK_COLOR: {
        'binding_key': "task.%s" % STACK_COLOR,
    }
}
CELERY_TASK_DEFAULT_EXCHANGE = 'tasks'
CELERY_TASK_DEFAULT_ROUTING_KEY = "task.%s" % STACK_COLOR

# The longest running tasks contain geoprocessing requests
# Keep the task and request time limit above, but in the ballpark of
# https://github.com/WikiWatershed/mmw-geoprocessing/blob/develop/api/src/main/resources/application.conf#L9
CELERY_TASK_TIME_LIMIT = 90
TASK_REQUEST_TIMEOUT = CELERY_TASK_TIME_LIMIT - 10
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
# See: https://docs.djangoproject.com/en/dev/ref/settings/#template-dirs
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [join(SITE_ROOT, 'templates')],
        'OPTIONS': {
            'context_processors': [
                'django.contrib.auth.context_processors.auth',
                'django.template.context_processors.debug',
                'django.template.context_processors.media',
                'django.template.context_processors.static',
                'django.template.context_processors.tz',
                'django.contrib.messages.context_processors.messages',
                'django.template.context_processors.request',
            ],
            'debug': DEBUG,
            'loaders': [
                'django.template.loaders.filesystem.Loader',
                'django.template.loaders.app_directories.Loader',
            ],
        },
    },
]
# END TEMPLATE CONFIGURATION


# MIDDLEWARE CONFIGURATION
# See: https://docs.djangoproject.com/en/1.11/topics/http/middleware/
MIDDLEWARE = (
    # Default Django middleware.
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    'mmw.middleware.BypassMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
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
    'rest_framework_gis',
    'drf_yasg',
    'rest_framework.authtoken',
    'corsheaders',
    'registration',
    'django_celery_results',
)

# THIRD-PARTY CONFIGURATION

# rest_framework
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_RATES': {
        'sustained': '5000/day',
        'burst': '20/min',
    },
}

# cors

CORS_ORIGIN_ALLOW_ALL = True
CORS_URLS_REGEX = r'^/api/.*$'

SWAGGER_SETTINGS = {
    'MMW_API_DESCRIPTION':
        '<p>'
        'The Model My Watershed API allows you to delineate watersheds and analyze geo-data for watersheds and arbitrary areas. '  # NOQA
        'You can read more about the work at <a href="http://www.wikiwatershed.org/">WikiWatershed</a> or use the <a href="https://modelmywatershed.org">web app</a>. '  # NOQA
        '</p>'
        '<p>'
        'To use this interactive API documentation, first get your API key from My Account > Account in the web app. '  # NOQA
        'Then, click on the green Authorize button just below and paste in <code>Token $YOUR_MMW_TOKEN</code> in the "Value" textbox, then click Authorize, then Close. '  # NOQA
        'All the endpoints in this documentation will then be prepared with your token, and you will now be able to run them interactively. '  # NOQA
        'Do not use the Django Login / Logout buttons. This API uses Token Authentication only. '  # NOQA
        '</p>'
        '<p>'
        'All <strong>analyze</strong> endpoints take <em>either</em> a MultiPolygon request body <em>or</em> a well-known area of interest query parameter. '  # NOQA
        'The shape of their result object is documented individually. '
        '</p>'
        '<p>'
        'All <strong>analyze</strong> and <strong>watershed</strong> endpoints return a <strong>Job Started Response</strong> on success. '  # NOQA
        'This response has a <code>job</code> value, as well as a <code>Location</code> header, either of which can be used with the <strong>jobs</strong> endpoint to get the result. '  # NOQA
        '</p>'
        '<p>'
        'The <strong>jobs</strong> endpoint has a <code>status</code> key, whose value is either <strong>started</strong>, <strong>complete</strong>, or <strong>failed</strong>. '  # NOQA
        'In cases of completion and failure, the <code>finished</code> key has a timestamp. '  # NOQA
        'The value of <code>result</code> depends on the kind of job it was. '  # NOQA
        '</p>',
    'SECURITY_DEFINITIONS': {
        'Token': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header',
            'description': 'Paste in `Token $YOUR_MMW_TOKEN` here',
            'scheme': 'Token',
        },
    },
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
    'apps.export',
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
    'omgeo.services.esri.EsriWGS',
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
MMW_MAX_AREA = 75e+9  # Max area in m², about the size of West Virginia

BIGCZ_HOST = 'portal.bigcz.org'  # BiG-CZ Host, for enabling custom behavior
BIGCZ_MAX_AREA = 5e+9  # Max area in m², limited by CUAHSI
BIGCZ_CLIENT_TIMEOUT = 8  # timeout in seconds
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

# HydroShare Integration Settings
HYDROSHARE = {
    'client_id': environ.get('MMW_HYDROSHARE_CLIENT_ID', 'model-my-watershed'),
    'client_secret': environ.get('MMW_HYDROSHARE_SECRET_KEY',
                                 'MISSING MMW_HYDROSHARE_SECRET_KEY ENV VAR'),
    'base_url': environ.get('MMW_HYDROSHARE_BASE_URL',
                            'https://beta.hydroshare.org/'),
    'authorize_url': 'o/authorize/',
    'access_token_url': 'o/token/'
}

# SRAT Catchment API Settings
SRAT_CATCHMENT_API = {
    'url': environ.get('MMW_SRAT_CATCHMENT_API_URL',
                       'ERROR: Could not get SRAT Catchment API URL'),
    'api_key': environ.get('MMW_SRAT_CATCHMENT_API_KEY',
                           'ERROR: Could not get SRAT Catchment API Key'),
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
        },
        'terrain': {
            'input': {
                'polygon': [],
                'polygonCRS': 'LatLng',
                'rasters': [
                    'ned-nhdplus-30m-epsg5070-512',
                    'us-percent-slope-30m-epsg5070-512',
                ],
                'rasterCRS': 'ConusAlbers',
                'operationType': 'RasterSummary',
                'zoom': 0
            }
        },
        'mapshed': {
            'shapes': [],
            'streamLines': '',
            'operations': [
                {
                    'name': 'RasterGroupedCount',
                    'label': 'nlcd_soil',
                    'rasters': [
                        'nlcd-2011-30m-epsg5070-512-int8',
                        'ssurgo-hydro-groups-30m-epsg5070-512-int8'
                    ]
                },
                {
                    'name': 'RasterLinesJoin',
                    'label': 'nlcd_streams',
                    'rasters': [
                        'nlcd-2011-30m-epsg5070-512-int8'
                    ]
                },
                {
                    'name': 'RasterGroupedCount',
                    'label': 'gwn',
                    'rasters': [
                        'us-groundwater-nitrogen-30m-epsg5070-512'
                    ]
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'avg_awc',
                    'targetRaster': 'us-ssurgo-aws100-30m-epsg5070-512',
                    'rasters': [
                        'us-groundwater-nitrogen-30m-epsg5070-512'
                    ]
                },
                {
                    'name': 'RasterGroupedCount',
                    'label': 'nlcd_slope',
                    'rasters': [
                        'nlcd-2011-30m-epsg5070-512-int8',
                        'us-percent-slope-30m-epsg5070-512'
                    ]
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'slope',
                    'targetRaster': 'us-percent-slope-30m-epsg5070-512',
                    'rasters': []
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'nlcd_kfactor',
                    'targetRaster': 'us-ssugro-kfactor-30m-epsg5070-512',
                    'rasters': [
                        'nlcd-2011-30m-epsg5070-512-int8'
                    ]
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'soiln',
                    'targetRaster': 'soiln-epsg5070',
                    'rasters': [],
                    'pixelIsArea': True
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'soilp',
                    'targetRaster': 'soilpallland2-epsg5070',
                    'rasters': [],
                    'pixelIsArea': True
                },
                {
                    'name': 'RasterGroupedAverage',
                    'label': 'recess_coef',
                    'targetRaster': 'bfi48grd-epsg5070',
                    'rasters': [],
                    'pixelIsArea': True
                }
            ]
        }
    }
}

# TILER CONFIGURATION
TILER_HOST = environ.get('MMW_TILER_HOST', 'localhost')
# END TILER CONFIGURATION

# UI ("CLIENT APP") USER CONFIGURATION
CLIENT_APP_USERNAME = 'mmw|client_app_user'
CLIENT_APP_USER_PASSWORD = environ.get('MMW_CLIENT_APP_USER_PASSWORD', 'mmw')
# END UI ("CLIENT APP") USER CONFIGURATION

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

# FEATURE FLAGS

ENABLED_FEATURES = environ.get('MMW_ENABLED_FEATURES', '').strip().split()

# END FEATURE FLAGS
