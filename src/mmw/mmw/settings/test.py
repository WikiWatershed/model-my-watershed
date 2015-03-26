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

INSTALLED_APPS += ('sbo_selenium',)

SELENIUM_SAUCE_CONNECT_PATH = os.environ.get('SELENIUM_SAUCE_CONNECT_PATH', '')
SELENIUM_SAUCE_USERNAME = os.environ.get('SAUCE_USER_NAME', '')
SELENIUM_SAUCE_API_KEY = os.environ.get('SAUCE_API_KEY', '')
