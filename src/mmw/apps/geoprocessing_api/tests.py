# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json

from django.test import (Client,
                         TestCase,
                         LiveServerTestCase)
from django.urls import reverse
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token

from django.contrib.gis.geos import GEOSGeometry

from apps.geoprocessing_api import (tasks, calcs)


class ExerciseManageApiToken(LiveServerTestCase):
    TOKEN_URL = reverse('geoprocessing_api:authtoken')

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
    def test_survey_land_only(self):
        self.maxDiff = None
        # NLCD Histogram of Cave Creek-Arizona Canal Diversion Channel HUC-10
        histogram = {
            'List(0)': 95,
            'List(43)': 35,
            'List(71)': 3228,
            'List(42)': 5758,
            'List(11)': 279,
            'List(81)': 57,
            'List(82)': 682,
            'List(52)': 499636,
            'List(21)': 73992,
            'List(22)': 110043,
            'List(23)': 105894,
            'List(24)': 20719,
            'List(90)': 461,
            'List(31)': 25,
            'List(95)': 159
        }

        expected = {
            "survey": {
                "displayName": "Land",
                "name": "land",
                "categories": [
                    {
                        "code": "mixed_forest",
                        "active_river_area": None,
                        "area": 35,
                        "nlcd": 43,
                        "coverage": 4.2627666817284424e-05,
                        "type": "Mixed Forest"
                    }, {
                        "code": "grassland",
                        "active_river_area": None,
                        "area": 3228,
                        "nlcd": 71,
                        "coverage": 0.00393148881389126,
                        "type": "Grassland/Herbaceous"
                    }, {
                        "code": "deciduous_forest",
                        "active_river_area": None,
                        "area": 0,
                        "nlcd": 41,
                        "coverage": 0.0,
                        "type": "Deciduous Forest"
                    }, {
                        "code": "evergreen_forest",
                        "active_river_area": None,
                        "area": 5758,
                        "nlcd": 42,
                        "coverage": 0.007012860158112106,
                        "type": "Evergreen Forest"
                    }, {
                        "code": "open_water",
                        "active_river_area": None,
                        "area": 279,
                        "nlcd": 11,
                        "coverage": 0.0003398034012006387,
                        "type": "Open Water"
                    }, {
                        "code": "perennial_ice",
                        "active_river_area": None,
                        "area": 0,
                        "nlcd": 12,
                        "coverage": 0.0,
                        "type": "Perennial Ice/Snow"
                    }, {
                        "code": "pasture",
                        "active_river_area": None,
                        "area": 57,
                        "nlcd": 81,
                        "coverage": 6.942220024529177e-05,
                        "type": "Pasture/Hay"
                    }, {
                        "code": "cultivated_crops",
                        "active_river_area": None,
                        "area": 682,
                        "nlcd": 82,
                        "coverage": 0.0008306305362682279,
                        "type": "Cultivated Crops"
                    }, {
                        "code": "shrub",
                        "active_river_area": None,
                        "area": 499636,
                        "nlcd": 52,
                        "coverage": 0.6085233410834492,
                        "type": "Shrub/Scrub"
                    }, {
                        "code": "developed_open",
                        "active_river_area": None,
                        "area": 73992,
                        "nlcd": 21,
                        "coverage": 0.09011732351841455,
                        "type": "Developed, Open Space"
                    }, {
                        "code": "developed_low",
                        "active_river_area": None,
                        "area": 110043,
                        "nlcd": 22,
                        "coverage": 0.13402503827355514,
                        "type": "Developed, Low Intensity"
                    }, {
                        "code": "developed_med",
                        "active_river_area": None,
                        "area": 105894,
                        "nlcd": 23,
                        "coverage": 0.12897183285570046,
                        "type": "Developed, Medium Intensity"
                    }, {
                        "code": "developed_high",
                        "active_river_area": None,
                        "area": 20719,
                        "nlcd": 24,
                        "coverage": 0.025234360822494743,
                        "type": "Developed, High Intensity"
                    }, {
                        "code": "woody_wetlands",
                        "active_river_area": None,
                        "area": 461,
                        "nlcd": 90,
                        "coverage": 0.0005614672686505177,
                        "type": "Woody Wetlands"
                    }, {
                        "code": "herbaceous_wetlands",
                        "active_river_area": None,
                        "area": 159,
                        "nlcd": 95,
                        "coverage": 0.00019365140068423496,
                        "type": "Emergent Herbaceous Wetlands"
                    }, {
                        "code": "barren_land",
                        "active_river_area": None,
                        "area": 25,
                        "nlcd": 31,
                        "coverage": 3.0448333440917446e-05,
                        "type": "Barren Land (Rock/Sand/Clay)"
                    }
                ]
            }
        }

        actual = tasks.analyze_nlcd(histogram)
        self.assertEqual(actual, expected)

    def test_survey_land_with_ara(self):
        self.maxDiff = None
        # NLCD + ARA Histogram of Little Neshaminy HUC-12
        histogram = {
            'List(11, -2147483648)': 5,
            'List(11, 1)': 34,
            'List(21, -2147483648)': 31228,
            'List(21, 1)': 9330,
            'List(22, -2147483648)': 20546,
            'List(22, 1)': 4684,
            'List(23, -2147483648)': 9019,
            'List(23, 1)': 1957,
            'List(24, -2147483648)': 3303,
            'List(24, 1)': 490,
            'List(31, -2147483648)': 232,
            'List(31, 1)': 132,
            'List(41, -2147483648)': 11964,
            'List(41, 1)': 7254,
            'List(42, -2147483648)': 138,
            'List(42, 1)': 15,
            'List(43, -2147483648)': 212,
            'List(43, 1)': 117,
            'List(52, -2147483648)': 2346,
            'List(52, 1)': 963,
            'List(71, -2147483648)': 424,
            'List(71, 1)': 260,
            'List(81, -2147483648)': 6814,
            'List(81, 1)': 2108,
            'List(82, -2147483648)': 4713,
            'List(82, 1)': 1632,
            'List(90, -2147483648)': 184,
            'List(90, 1)': 3756,
            'List(95, -2147483648)': 7,
            'List(95, 1)': 105
        }
        expected = {
            "survey": {
                "categories": [
                    {
                        "active_river_area": 117,
                        "area": 329,
                        "code": "mixed_forest",
                        "coverage": 0.002653825057270997,
                        "nlcd": 43,
                        "type": "Mixed Forest"
                    },
                    {
                        "active_river_area": 260,
                        "area": 684,
                        "code": "grassland",
                        "coverage": 0.005517374891104443,
                        "nlcd": 71,
                        "type": "Grassland/Herbaceous"
                    },
                    {
                        "active_river_area": 7254,
                        "area": 19218,
                        "code": "deciduous_forest",
                        "coverage": 0.1550188752298906,
                        "nlcd": 41,
                        "type": "Deciduous Forest"
                    },
                    {
                        "active_river_area": 15,
                        "area": 153,
                        "code": "evergreen_forest",
                        "coverage": 0.001234149646694415,
                        "nlcd": 42,
                        "type": "Evergreen Forest"
                    },
                    {
                        "active_river_area": 34,
                        "area": 39,
                        "code": "open_water",
                        "coverage": 0.00031458716484367437,
                        "nlcd": 11,
                        "type": "Open Water"
                    },
                    {
                        "active_river_area": 0,
                        "area": 0,
                        "code": "perennial_ice",
                        "coverage": 0.0,
                        "nlcd": 12,
                        "type": "Perennial Ice/Snow"
                    },
                    {
                        "active_river_area": 2108,
                        "area": 8922,
                        "code": "pasture",
                        "coverage": 0.07196786371116058,
                        "nlcd": 81,
                        "type": "Pasture/Hay"
                    },
                    {
                        "active_river_area": 1632,
                        "area": 6345,
                        "code": "cultivated_crops",
                        "coverage": 0.051180911818797796,
                        "nlcd": 82,
                        "type": "Cultivated Crops"
                    },
                    {
                        "active_river_area": 963,
                        "area": 3309,
                        "code": "shrub",
                        "coverage": 0.026691510986351755,
                        "nlcd": 52,
                        "type": "Shrub/Scrub"
                    },
                    {
                        "active_river_area": 9330,
                        "area": 40558,
                        "code": "developed_open",
                        "coverage": 0.32715451876230117,
                        "nlcd": 21,
                        "type": "Developed, Open Space"
                    },
                    {
                        "active_river_area": 4684,
                        "area": 25230,
                        "code": "developed_low",
                        "coverage": 0.20351369664117705,
                        "nlcd": 22,
                        "type": "Developed, Low Intensity"
                    },
                    {
                        "active_river_area": 1957,
                        "area": 10976,
                        "code": "developed_med",
                        "coverage": 0.0885361210595941,
                        "nlcd": 23,
                        "type": "Developed, Medium Intensity"
                    },
                    {
                        "active_river_area": 490,
                        "area": 3793,
                        "code": "developed_high",
                        "coverage": 0.030595618365437355,
                        "nlcd": 24,
                        "type": "Developed, High Intensity"
                    },
                    {
                        "active_river_area": 3756,
                        "area": 3940,
                        "code": "woody_wetlands",
                        "coverage": 0.0317813699867712,
                        "nlcd": 90,
                        "type": "Woody Wetlands"
                    },
                    {
                        "active_river_area": 105,
                        "area": 112,
                        "code": "herbaceous_wetlands",
                        "coverage": 0.000903429806730552,
                        "nlcd": 95,
                        "type": "Emergent Herbaceous Wetlands"
                    },
                    {
                        "active_river_area": 132,
                        "area": 364,
                        "code": "barren_land",
                        "coverage": 0.0029361468718742943,
                        "nlcd": 31,
                        "type": "Barren Land (Rock/Sand/Clay)"
                    }
                ],
                "displayName": "Land",
                "name": "land"
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


class ExerciseCatchmentIntersectsAOI(TestCase):
    def test_sq_km_aoi(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -75.27900695800781,
                        39.891925022904516
                    ],
                    [
                        -75.26608943939209,
                        39.891925022904516
                    ],
                    [
                        -75.26608943939209,
                        39.90173657727282
                    ],
                    [
                        -75.27900695800781,
                        39.90173657727282
                    ],
                    [
                        -75.27900695800781,
                        39.891925022904516
                    ]
                ]
            ]
        }), srid=4326)

        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -75.28535842895508,
                        39.898279646242635
                    ],
                    [
                        -75.27896404266357,
                        39.898279646242635
                    ],
                    [
                        -75.27896404266357,
                        39.90305345750681
                    ],
                    [
                        -75.28535842895508,
                        39.90305345750681
                    ],
                    [
                        -75.28535842895508,
                        39.898279646242635
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -75.26849269866943,
                        39.890838422106924
                    ],
                    [
                        -75.26244163513184,
                        39.890838422106924
                    ],
                    [
                        -75.26244163513184,
                        39.89498716884207
                    ],
                    [
                        -75.26849269866943,
                        39.89498716884207
                    ],
                    [
                        -75.26849269866943,
                        39.890838422106924
                    ]
                ]
            ]
        }

        contained_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -75.27368545532225,
                        39.89722607068418
                    ],
                    [
                        -75.26887893676758,
                        39.89722607068418
                    ],
                    [
                        -75.26887893676758,
                        39.90124274066003
                    ],
                    [
                        -75.27368545532225,
                        39.90124274066003
                    ],
                    [
                        -75.27368545532225,
                        39.89722607068418
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       contained_catchment))

    def test_hundred_sq_km_aoi(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -94.64584350585938,
                        38.96154447940714
                    ],
                    [
                        -94.53460693359374,
                        38.96154447940714
                    ],
                    [
                        -94.53460693359374,
                        39.05225165582583
                    ],
                    [
                        -94.64584350585938,
                        39.05225165582583
                    ],
                    [
                        -94.64584350585938,
                        38.96154447940714
                    ]
                ]
            ]
        }), srid=4326)
        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -94.53563690185547,
                        39.03065255999985
                    ],
                    [
                        -94.49203491210938,
                        39.03065255999985
                    ],
                    [
                        -94.49203491210938,
                        39.07864158248181
                    ],
                    [
                        -94.53563690185547,
                        39.07864158248181
                    ],
                    [
                        -94.53563690185547,
                        39.03065255999985
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -94.55554962158203,
                        38.92870117926206
                    ],
                    [
                        -94.49581146240233,
                        38.92870117926206
                    ],
                    [
                        -94.49581146240233,
                        38.9858333874019
                    ],
                    [
                        -94.55554962158203,
                        38.9858333874019
                    ],
                    [
                        -94.55554962158203,
                        38.92870117926206
                    ]
                ]
            ]
        }

        contained_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -94.62284088134766,
                        38.997841307500714
                    ],
                    [
                        -94.58576202392578,
                        38.997841307500714
                    ],
                    [
                        -94.58576202392578,
                        39.031452644263084
                    ],
                    [
                        -94.62284088134766,
                        39.031452644263084
                    ],
                    [
                        -94.62284088134766,
                        38.997841307500714
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       contained_catchment))

    def test_thousand_sq_km_aoi(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -96.1083984375,
                        41.12074559016745
                    ],
                    [
                        -95.7513427734375,
                        41.12074559016745
                    ],
                    [
                        -95.7513427734375,
                        41.39741506646461
                    ],
                    [
                        -96.1083984375,
                        41.39741506646461
                    ],
                    [
                        -96.1083984375,
                        41.12074559016745
                    ]
                ]
            ]
        }), srid=4326)
        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -96.18255615234375,
                        41.24064190269475
                    ],
                    [
                        -96.10736846923828,
                        41.24064190269475
                    ],
                    [
                        -96.10736846923828,
                        41.2765163855178
                    ],
                    [
                        -96.18255615234375,
                        41.2765163855178
                    ],
                    [
                        -96.18255615234375,
                        41.24064190269475
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -95.8172607421875,
                        41.0607151401866
                    ],
                    [
                        -95.68405151367188,
                        41.0607151401866
                    ],
                    [
                        -95.68405151367188,
                        41.160046141686905
                    ],
                    [
                        -95.8172607421875,
                        41.160046141686905
                    ],
                    [
                        -95.8172607421875,
                        41.0607151401866
                    ]
                ]
            ]
        }

        contained_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -95.93811035156249,
                        41.306697618181865
                    ],
                    [
                        -95.82550048828125,
                        41.306697618181865
                    ],
                    [
                        -95.82550048828125,
                        41.3757780692323
                    ],
                    [
                        -95.93811035156249,
                        41.3757780692323
                    ],
                    [
                        -95.93811035156249,
                        41.306697618181865
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       contained_catchment))

    def test_ten_thousand_sq_km_aoi(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -115.01586914062499,
                        43.866218006556394
                    ],
                    [
                        -113.719482421875,
                        43.866218006556394
                    ],
                    [
                        -113.719482421875,
                        44.89479576469787
                    ],
                    [
                        -115.01586914062499,
                        44.89479576469787
                    ],
                    [
                        -115.01586914062499,
                        43.866218006556394
                    ]
                ]
            ]
        }), srid=4326)

        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -115.23559570312499,
                        44.380802793578475
                    ],
                    [
                        -115.00488281250001,
                        44.380802793578475
                    ],
                    [
                        -115.00488281250001,
                        44.52001001133986
                    ],
                    [
                        -115.23559570312499,
                        44.52001001133986
                    ],
                    [
                        -115.23559570312499,
                        44.380802793578475
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -115.17791748046875,
                        43.775060351224695
                    ],
                    [
                        -114.949951171875,
                        43.775060351224695
                    ],
                    [
                        -114.949951171875,
                        44.09350315285847
                    ],
                    [
                        -115.17791748046875,
                        44.09350315285847
                    ],
                    [
                        -115.17791748046875,
                        43.775060351224695
                    ]
                ]
            ]
        }

        contained_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -114.43359375,
                        44.262904233655384
                    ],
                    [
                        -114.06829833984375,
                        44.262904233655384
                    ],
                    [
                        -114.06829833984375,
                        44.61393394730626
                    ],
                    [
                        -114.43359375,
                        44.61393394730626
                    ],
                    [
                        -114.43359375,
                        44.262904233655384
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       contained_catchment))

    def test_huge_aoi_tiny_catchments(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -85.166015625,
                        39.470125122358176
                    ],
                    [
                        -82.44140625,
                        39.470125122358176
                    ],
                    [
                        -82.44140625,
                        42.94033923363181
                    ],
                    [
                        -85.166015625,
                        42.94033923363181
                    ],
                    [
                        -85.166015625,
                        39.470125122358176
                    ]
                ]
            ]
        }), srid=4326)

        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -85.440673828125,
                        42.68243539838623
                    ],
                    [
                        -85.15502929687499,
                        42.68243539838623
                    ],
                    [
                        -85.15502929687499,
                        42.79540065303723
                    ],
                    [
                        -85.440673828125,
                        42.79540065303723
                    ],
                    [
                        -85.440673828125,
                        42.68243539838623
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -82.63916015625,
                        41.94314874732696
                    ],
                    [
                        -82.265625,
                        41.94314874732696
                    ],
                    [
                        -82.265625,
                        42.06560675405716
                    ],
                    [
                        -82.63916015625,
                        42.06560675405716
                    ],
                    [
                        -82.63916015625,
                        41.94314874732696
                    ]
                ]
            ]
        }

        contained_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -83.671875,
                        39.65645604812829
                    ],
                    [
                        -83.34228515625,
                        39.65645604812829
                    ],
                    [
                        -83.34228515625,
                        39.9434364619742
                    ],
                    [
                        -83.671875,
                        39.9434364619742
                    ],
                    [
                        -83.671875,
                        39.65645604812829
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       contained_catchment))

    def test_huge_catchments_tiny_aoi(self):
        aoi = GEOSGeometry(json.dumps({
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -86.1189079284668,
                        30.712618489700507
                    ],
                    [
                        -86.11066818237303,
                        30.712618489700507
                    ],
                    [
                        -86.11066818237303,
                        30.719554693895116
                    ],
                    [
                        -86.1189079284668,
                        30.719554693895116
                    ],
                    [
                        -86.1189079284668,
                        30.712618489700507
                    ]
                ]
            ]
        }), srid=4326)

        reprojected_aoi = aoi.transform(5070, clone=True)

        abutting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -86.11856460571288,
                        30.71940712027702
                    ],
                    [
                        -86.12113952636719,
                        30.88395860861961
                    ],
                    [
                        -86.38206481933594,
                        30.884547891921986
                    ],
                    [
                        -86.37931823730467,
                        30.71586528568626
                    ],
                    [
                        -86.11856460571288,
                        30.71940712027702
                    ]
                ]
            ]
        }

        intersecting_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -86.13006591796874,
                        30.59832078510471
                    ],
                    [
                        -85.9075927734375,
                        30.59832078510471
                    ],
                    [
                        -85.9075927734375,
                        30.714094319607913
                    ],
                    [
                        -86.13006591796874,
                        30.714094319607913
                    ],
                    [
                        -86.13006591796874,
                        30.59832078510471
                    ]
                ]
            ]
        }

        containing_catchment = {
            "type": "Polygon",
            "coordinates": [
                [
                    [
                        -86.22550964355469,
                        30.627277165616874
                    ],
                    [
                        -86.0394287109375,
                        30.627277165616874
                    ],
                    [
                        -86.0394287109375,
                        30.80967992229391
                    ],
                    [
                        -86.22550964355469,
                        30.80967992229391
                    ],
                    [
                        -86.22550964355469,
                        30.627277165616874
                    ]
                ]
            ]
        }

        self.assertFalse(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                        abutting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       intersecting_catchment))
        self.assertTrue(calcs.catchment_intersects_aoi(reprojected_aoi,
                                                       containing_catchment))
