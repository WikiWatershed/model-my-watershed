# -*- coding: utf-8 -*-
import json

from django.conf import settings

from rauth import OAuth2Service, OAuth2Session


class ItsiService(OAuth2Service):
    """
    An OAuth 2.0 Service container for ITSI Portal.

    This class provides a wrapper around the OAuth2Service class which has been
    initialized with site-wide parameters. It initializes the OAuth2Service
    with client_id, client_secret, and base_url taken from app settings, with
    AUTHORIZE_URL and ACCESS_TOKEN_URL which are explicitly defined, and with a
    custom ItsiSession object which is a sub-class of OAuth2Session and
    provides some convenience methods for getting data.

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

    AUTHORIZE_URL = 'auth/concord_id/authorize'
    ACCESS_TOKEN_URL = 'auth/concord_id/access_token'

    def __init__(self):
        super(ItsiService, self).__init__(
            settings.ITSI['client_id'],
            settings.ITSI['client_secret'],
            'itsi',
            settings.ITSI['base_url'] + self.ACCESS_TOKEN_URL,
            settings.ITSI['base_url'] + self.AUTHORIZE_URL,
            settings.ITSI['base_url'],
            ItsiSession
        )

    def get_session_from_code(self, code):
        data = {'code': code, 'grant_type': 'authorization_code'}

        tokens = json.loads(self.get_raw_access_token(data=data).content)

        return self.get_session(token=tokens['access_token'])


class ItsiSession(OAuth2Session):
    """
    An OAuth 2.0 Session container for ITSI Portal.

    This is a simple wrapper around the OAuth2Session class, and provides a
    convenience method for getting user data from ITSI Portal.

    Documentation for OAuth2Session can be found here:
    https://rauth.readthedocs.org/en/latest/api/#oauth-2-0-sessions
    """

    USER_JSON_URL = 'auth/concord_id/user.json'

    def get_user(self):
        user_json = self.get(settings.ITSI['base_url'] + self.USER_JSON_URL)

        return json.loads(user_json.content)
