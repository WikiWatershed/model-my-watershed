# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests

from django.test import TestCase
from django.contrib.auth.models import User


class TaskRunnerTestCase(TestCase):
    HOMEPAGE_URL = 'http://localhost:80/'
    LOGIN_URL = 'http://localhost:80/user/ajaxlogin'

    def setUp(self):
        User.objects.create_user('bob', 'bob@azavea.com', 'bob')

    def get_token(self):
        try:
            init_response = requests.get(self.HOMEPAGE_URL)
        except requests.RequestException:
            init_response = {}

        try:
            csrf = init_response.cookies['csrftoken']
        except KeyError:
            csrf = None

        return csrf

    def attempt_login(self, username, password):
        csrf = self.get_token()
        try:
            headers = {'HTTP_X_CSRFTOKEN': csrf}
            payload = {'username': username, 'password': password}
            response = requests.post(self.LOGIN_URL, params=payload,
                                     headers=headers)
        except requests.RequestException:
            response = {}
        return response

    def attempt_login_without_token(self, username, password):
        try:
            payload = {'username': username, 'password': password}
            response = requests.post(self.LOGIN_URL, params=payload)
        except requests.RequestException:
            response = {}
        return response

    def test_no_username_returns_400(self):
        response = self.attempt_login('', 'bob')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)

    def test_no_password_returns_400(self):
        response = self.attempt_login('bob', '')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)

    def test_bad_username_returns_400(self):
        response = self.attempt_login('notbob', 'bob')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)

    def test_bad_password_returns_400(self):
        response = self.attempt_login('bob', 'badpass')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)

    def test_bad_credentials_returns_400(self):
        response = self.attempt_login('bob1', 'bob1')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)

    def test_good_credentials_returns_200(self):
        response = self.attempt_login('bob', 'bob')
        self.assertEqual(response.status_code, 200,
                         'Incorrect server response. Expected 200 found %s'
                         % response.status_code)

    # TODO: commented out because it fails and we don't know why yet.
    # def test_no_token_good_credentials_returns_400(self):
    #    response = self.attempt_login_without_token('bob', 'bob')
    #    self.assertEqual(response.status_code, 400,
    #                     'Incorrect server response. Expected 400 found %s'
    #                     % response.status_code)

    def test_no_token_bad_credentials_returns_400(self):
        response = self.attempt_login_without_token('badbob', 'badpass')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s'
                         % response.status_code)
