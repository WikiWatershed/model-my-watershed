import os

from base import *  # NOQA

# TEST SETTINGS
ALLOWED_HOSTS = ['localhost']

PASSWORD_HASHERS = (
    'django.contrib.auth.hashers.MD5PasswordHasher',
)

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.dummy.DummyCache',
    }
}

SELENIUM_DEFAULT_BROWSER = 'firefox'
SELENIUM_TEST_COMMAND_OPTIONS = {'pattern': 'uitest*.py'}

DJANGO_LIVE_TEST_SERVER_ADDRESS = os.environ.get(
    'DJANGO_LIVE_TEST_SERVER_ADDRESS', 'localhost:9001')

# Turn off DRF GUI
REST_FRAMEWORK = {
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    )
}

# API key for testing/development
GOOGLE_MAPS_API_KEY = 'AIzaSyB0D5gjoIHpmy-xdP2cr_0I-E7K6s_L0k4'
