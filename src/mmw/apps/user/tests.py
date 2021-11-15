# -*- coding: utf-8 -*-
from django.test import LiveServerTestCase
from django.test import (TestCase,
                         Client)
from django.contrib.auth.models import User
from django.urls import reverse
from apps.user.views import trim_to_valid_length
from apps.user.models import UserProfile


class TaskRunnerTestCase(LiveServerTestCase):
    LOGIN_URL = reverse('user:login')

    def setUp(self):
        User.objects.create_user(username='bob', email='bob@azavea.com',
                                 password='bob')

    def attempt_login(self, username, password):
        c = Client()
        payload = {'username': username, 'password': password}
        response = c.post(self.LOGIN_URL, payload)
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


class ItsiSignupTestCase(TestCase):

    def test_small_name(self):
        username = trim_to_valid_length('shortname', '.itsi')
        self.assertLessEqual(len(username), 30)
        self.assertEqual(username, 'shortname.itsi', 'The short name should ' +
                         'be concatenated but otherwise unmodified')

    def test_large_name(self):
        username = trim_to_valid_length(
            'thisisaverylongnamethatisinfacttoolong', '.itsi')
        self.assertEqual(len(username), 30)


class UserProfileTestCase(TestCase):

    def test_default_values(self):
        profile = UserProfile()
        self.assertEqual(
            profile.country,
            'US',
            'The default country for a new profile should be "US"')
        self.assertEqual(
            profile.user_type,
            'Unspecified',
            'The default user_type for a new profile should be "Unspecified"')
        self.assertFalse(
            profile.was_skipped,
            'The default value for was_skipped should be "False"')
        self.assertEqual(
            profile.organization,
            '',
            'The default organization for a new profile should be blank')
        self.assertEqual(
            profile.postal_code,
            '',
            'The default postal_code for a new profile should be blank')

    def test_can_save_without_setting_any_values(self):
        user = User.objects.create(username='t',
                                   email='t@example.com',
                                   password='t')
        UserProfile.objects.create(user=user)
