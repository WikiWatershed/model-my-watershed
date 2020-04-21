# -*- coding: utf-8 -*-
import json

from django.conf import settings
from urlparse import urljoin

from rauth import OAuth2Service, OAuth2Session


class SSOService(OAuth2Service):
    """
    An OAuth 2.0 Service container for Single Sign On.

    This class provides a wrapper around the OAuth2Service class which has been
    initialized with site-wide parameters. It initializes the OAuth2Service
    with client_id, client_secret, base_url, authorize_url, and
    access_token_url taken from given config, and with a custom session object
    which is a sub-class of OAuth2Session and provides some convenience methods
    for getting data.

    Documentation for OAuth2Service can be found here:
    https://rauth.readthedocs.org/en/latest/api/#oauth-2-0-services

    Expected usage is as follows:
        # Initialization
        itsi = ItsiService()

        # Construct a redirect_uri to receive code from ITSI, then get
        # authorization url and perform redirect
        redirect_uri = ???
        params = {'redirect_uri': redirect_uri}
        auth_url = itsi.get_authorize_url(**params)
        redirect(auth_url)

        # Receive code from ITSI, then start a session and use the session to
        # get the user object
        code = ???
        session = itsi.get_session_from_code(code)
        user = session.get_user()
    """

    def __init__(self, config, SessionClass):
        super(SSOService, self).__init__(
            config['client_id'],
            config['client_secret'],
            config['service_name'],
            urljoin(config['base_url'],
                    config['access_token_url']),
            urljoin(config['base_url'],
                    config['authorize_url']),
            config['base_url'],
            SessionClass
        )

    def get_session_from_code(self, code):
        data = {'code': code, 'grant_type': 'authorization_code'}

        tokens = json.loads(self.get_raw_access_token(data=data).content)

        return self.get_session(token=tokens['access_token'])


class SSOSession(OAuth2Session):
    """
    An OAuth 2.0 Session container for Single Sign On.

    This is a simple wrapper around the OAuth2Session class, and provides a
    convenience method for getting user data from OAuth providers. Must be
    initialized with a config dictionary.

    Documentation for OAuth2Session can be found here:
    https://rauth.readthedocs.org/en/latest/api/#oauth-2-0-sessions
    """

    def __init__(self, config, args, kwargs):
        super(SSOSession, self).__init__(*args, **kwargs)
        self.user_json_url = urljoin(config['base_url'],
                                     config['user_json_url'])

    def get_user(self):
        user_json = self.get(self.user_json_url)

        return json.loads(user_json.content)


class ItsiService(SSOService):
    def __init__(self):
        super(ItsiService, self).__init__(
            settings.ITSI,
            ItsiSession
        )


class ItsiSession(SSOSession):
    def __init__(self, *args, **kwargs):
        super(ItsiSession, self).__init__(settings.ITSI, args, kwargs)


class ConcordService(SSOService):
    def __init__(self):
        super(ConcordService, self).__init__(
            settings.CONCORD,
            ConcordSession
        )


class ConcordSession(SSOSession):
    def __init__(self, *args, **kwargs):
        super(ConcordSession, self).__init__(settings.CONCORD, args, kwargs)
