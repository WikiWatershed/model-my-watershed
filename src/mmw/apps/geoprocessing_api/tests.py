# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.test import (Client,
                         TestCase,
                         LiveServerTestCase)
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token

from apps.geoprocessing_api import tasks


class ExerciseManageApiToken(LiveServerTestCase):
    TOKEN_URL = 'http://localhost:8081/api/token/'

    def setUp(self):
        User.objects.create_user(username='bob', email='bob@azavea.com',
                                 password='bob')

        User.objects.create_user(username='nono', email='nono@azavea.com',
                                 password='nono')

    def get_logged_in_session(self, username, password):
        c = Client()
        c.login(username=username,
                password=password)
        return c

    def get_api_token(self, username='', password='',
                      session=None, regenerate=False):
        if not session:
            session = Client()

        payload = {}
        if username or password:
            payload.update({'username': username,
                            'password': password})
        if regenerate:
            payload.update({'regenerate': True})

        return session.post(self.TOKEN_URL,
                            data=payload)

    def test_get_api_token_no_credentials_returns_400(self):
        response = self.get_api_token()
        self.assertEqual(response.status_code, 403,
                         'Incorrect server response. Expected 403 found %s %s'
                         % (response.status_code, response.content))

    def test_get_api_token_bad_body_credentials_returns_400(self):
        response = self.get_api_token('bad', 'bad')
        self.assertEqual(response.status_code, 400,
                         'Incorrect server response. Expected 400 found %s %s'
                         % (response.status_code, response.content))

    def test_get_api_token_good_body_credentials_returns_200(self):
        response = self.get_api_token('bob', 'bob')
        self.assertEqual(response.status_code, 200,
                         'Incorrect server response. Expected 200 found %s %s'
                         % (response.status_code, response.content))

    def test_get_api_token_good_session_credentials_returns_200(self):
        s = self.get_logged_in_session('bob', 'bob')
        response = self.get_api_token(session=s)
        self.assertEqual(response.status_code, 200,
                         'Incorrect server response. Expected 200 found %s %s'
                         % (response.status_code, response.content))

    def test_get_api_token_uses_body_credentials_over_session(self):
        bob_user = User.objects.get(username='bob')
        bob_token = Token.objects.get(user=bob_user)

        s = self.get_logged_in_session('nono', 'nono')
        response = self.get_api_token('bob', 'bob', s)

        self.assertEqual(response.status_code, 200,
                         'Incorrect server response. Expected 200 found %s %s'
                         % (response.status_code, response.content))

        response_token = json.loads(response.content)['token']

        self.assertEqual(str(response_token), str(bob_token),
                         """ Incorrect server response.
                         Expected to get token for user
                         given in request body %s, but got %s
                         """ % (bob_token, response_token))

    def test_get_api_token_doesnt_regenerate_token(self):
        bob_user = User.objects.get(username='bob')
        bob_token_before = Token.objects.get(user=bob_user)

        response = self.get_api_token('bob', 'bob')

        response_token = json.loads(response.content)['token']

        self.assertEqual(str(response_token), str(bob_token_before),
                         """ Expected request token to be the same
                         as token before the request was made
                         (%s), but got %s
                         """ % (bob_token_before, response_token))

        bob_token_after = Token.objects.get(user=bob_user)
        self.assertEqual(bob_token_before, bob_token_after,
                         """ Expected token to be the same
                         as it was before the request was made
                         (%s), but got %s
                         """ % (bob_token_before, bob_token_after))

    def test_get_api_token_can_regenerate_token(self):
        bob_user = User.objects.get(username='bob')
        old_bob_token = Token.objects.get(user=bob_user)

        response = self.get_api_token('bob', 'bob', regenerate=True)

        response_token = json.loads(response.content)['token']
        new_bob_token = Token.objects.get(user=bob_user)

        self.assertEqual(str(response_token), str(new_bob_token),
                         """ Expected regenerated response token to
                         be the same as stored token (%s), but got %s
                         """ % (new_bob_token, response_token))

        self.assertTrue(old_bob_token is not new_bob_token,
                        """ Expected new token to be created
                        but token is the same""")


class ExerciseAnalyze(TestCase):
    def test_survey_land(self):
        self.maxDiff = None
        # NLCD Histogram of Little Neshaminy HUC-12
        histogram = {
            'List(11)': 39,
            'List(21)': 40558,
            'List(22)': 25230,
            'List(23)': 10976,
            'List(24)': 3793,
            'List(31)': 364,
            'List(41)': 19218,
            'List(42)': 153,
            'List(43)': 329,
            'List(52)': 3309,
            'List(71)': 684,
            'List(81)': 8922,
            'List(82)': 6345,
            'List(90)': 3940,
            'List(95)': 112,
        }
        expected = {
            "survey": {
                "displayName": "Land",
                "name": "land",
                "categories": [
                    {
                        "area": 329,
                        "code": "mixed_forest",
                        "coverage": 0.002653825057270997,
                        "nlcd": 43,
                        "type": "Mixed Forest"
                    },
                    {
                        "area": 684,
                        "code": "grassland",
                        "coverage": 0.005517374891104443,
                        "nlcd": 71,
                        "type": "Grassland/Herbaceous"
                    },
                    {
                        "area": 19218,
                        "code": "deciduous_forest",
                        "coverage": 0.1550188752298906,
                        "nlcd": 41,
                        "type": "Deciduous Forest"
                    },
                    {
                        "area": 153,
                        "code": "evergreen_forest",
                        "coverage": 0.001234149646694415,
                        "nlcd": 42,
                        "type": "Evergreen Forest"
                    },
                    {
                        "area": 39,
                        "code": "open_water",
                        "coverage": 0.00031458716484367437,
                        "nlcd": 11,
                        "type": "Open Water"
                    },
                    {
                        "area": 0,
                        "code": "perennial_ice",
                        "coverage": 0,
                        "nlcd": 12,
                        "type": "Perennial Ice/Snow"
                    },
                    {
                        "area": 8922,
                        "code": "pasture",
                        "coverage": 0.07196786371116058,
                        "nlcd": 81,
                        "type": "Pasture/Hay"
                    },
                    {
                        "area": 6345,
                        "code": "cultivated_crops",
                        "coverage": 0.051180911818797796,
                        "nlcd": 82,
                        "type": "Cultivated Crops"
                    },
                    {
                        "area": 3309,
                        "code": "shrub",
                        "coverage": 0.026691510986351755,
                        "nlcd": 52,
                        "type": "Shrub/Scrub"
                    },
                    {
                        "area": 40558,
                        "code": "developed_open",
                        "coverage": 0.32715451876230117,
                        "nlcd": 21,
                        "type": "Developed, Open Space"
                    },
                    {
                        "area": 25230,
                        "code": "developed_low",
                        "coverage": 0.20351369664117705,
                        "nlcd": 22,
                        "type": "Developed, Low Intensity"
                    },
                    {
                        "area": 10976,
                        "code": "developed_med",
                        "coverage": 0.0885361210595941,
                        "nlcd": 23,
                        "type": "Developed, Medium Intensity"
                    },
                    {
                        "area": 3793,
                        "code": "developed_high",
                        "coverage": 0.030595618365437355,
                        "nlcd": 24,
                        "type": "Developed, High Intensity"
                    },
                    {
                        "area": 3940,
                        "code": "woody_wetlands",
                        "coverage": 0.0317813699867712,
                        "nlcd": 90,
                        "type": "Woody Wetlands"
                    },
                    {
                        "area": 112,
                        "code": "herbaceous_wetlands",
                        "coverage": 0.000903429806730552,
                        "nlcd": 95,
                        "type": "Emergent Herbaceous Wetlands"
                    },
                    {
                        "area": 364,
                        "code": "barren_land",
                        "coverage": 0.0029361468718742943,
                        "nlcd": 31,
                        "type": "Barren Land (Rock/Sand/Clay)"
                    }
                ]
            }
        }

        actual = tasks.analyze_nlcd(histogram)
        self.assertEqual(actual, expected)

    def test_survey_soil(self):
        self.maxDiff = None

        # Soil histogram of Little Neshaminy HUC-12
        histogram = {
            'List(-2147483648)': 47430,
            'List(1)': 2905,
            'List(2)': 14165,
            'List(3)': 23288,
            'List(4)': 23109,
            'List(6)': 338,
            'List(7)': 12737,
        }
        expected = {
            "survey": {
                "displayName": "Soil",
                "name": "soil",
                "categories": [
                    {
                        "area": 2905,
                        "code": "a",
                        "coverage": 0.023432710612073693,
                        "type": "A - High Infiltration"
                    },
                    {
                        "area": 14165,
                        "code": "b",
                        "coverage": 0.11425967153873455,
                        "type": "B - Moderate Infiltration"
                    },
                    {
                        "area": 70718,
                        "code": "c",
                        "coverage": 0.5704352595747427,
                        "type": "C - Slow Infiltration"
                    },
                    {
                        "area": 23109,
                        "code": "d",
                        "coverage": 0.1864049946762172,
                        "type": "D - Very Slow Infiltration"
                    },
                    {
                        "area": 0,
                        "code": "ad",
                        "coverage": 0,
                        "type": "A/D - High/Very Slow Infiltration"
                    },
                    {
                        "area": 338,
                        "code": "bd",
                        "coverage": 0.0027264220953118444,
                        "type": "B/D - Medium/Very Slow Infiltration"
                    },
                    {
                        "area": 12737,
                        "code": "cd",
                        "coverage": 0.10274094150292001,
                        "type": "C/D - Medium/Very Slow Infiltration"
                    }
                ],
            }
        }

        actual = tasks.analyze_soil(histogram)
        self.assertEqual(actual, expected)
