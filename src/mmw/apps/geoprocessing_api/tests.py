# -*- coding: utf-8 -*-
import json

from unittest import skip
from os.path import join, dirname, abspath

from django.test import (Client,
                         TestCase)
from django.urls import reverse
from django.contrib.auth.models import User

from rest_framework.authtoken.models import Token

from django.contrib.gis.geos import GEOSGeometry
from django.utils.timezone import now

from apps.core.models import Job, JobStatus
from apps.geoprocessing_api import (tasks, calcs)
from apps.modeling.calcs import apply_gwlfe_modifications


class ExerciseManageApiToken(TestCase):
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
            'List(0, -2147483648)': 95,
            'List(43, -2147483648)': 35,
            'List(71, -2147483648)': 3228,
            'List(42, -2147483648)': 5758,
            'List(11, -2147483648)': 279,
            'List(81, -2147483648)': 57,
            'List(82, -2147483648)': 682,
            'List(52, -2147483648)': 499636,
            'List(21, -2147483648)': 73992,
            'List(22, -2147483648)': 110043,
            'List(23, -2147483648)': 105894,
            'List(24, -2147483648)': 20719,
            'List(90, -2147483648)': 461,
            'List(31, -2147483648)': 25,
            'List(95, -2147483648)': 159
        }

        expected = {
            "survey": {
                "displayName": "Land Use/Cover 2011 (NLCD11)",
                "name": "land_2011_2011",
                "categories": [
                    {
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
                        "code": "barren_land",
                        "active_river_area": None,
                        "area": 25,
                        "nlcd": 31,
                        "coverage": 3.0448333440917446e-05,
                        "type": "Barren Land (Rock/Sand/Clay)"
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
                        "code": "mixed_forest",
                        "active_river_area": None,
                        "area": 35,
                        "nlcd": 43,
                        "coverage": 4.2627666817284424e-05,
                        "type": "Mixed Forest"
                    }, {
                        "code": "shrub",
                        "active_river_area": None,
                        "area": 499636,
                        "nlcd": 52,
                        "coverage": 0.6085233410834492,
                        "type": "Shrub/Scrub"
                    }, {
                        "code": "grassland",
                        "active_river_area": None,
                        "area": 3228,
                        "nlcd": 71,
                        "coverage": 0.00393148881389126,
                        "type": "Grassland/Herbaceous"
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
                    }
                ]
            }
        }

        actual = tasks.analyze_nlcd(histogram, nlcd_year='2011_2011')
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
                        "active_river_area": 132,
                        "area": 364,
                        "code": "barren_land",
                        "coverage": 0.0029361468718742943,
                        "nlcd": 31,
                        "type": "Barren Land (Rock/Sand/Clay)"
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
                        "active_river_area": 117,
                        "area": 329,
                        "code": "mixed_forest",
                        "coverage": 0.002653825057270997,
                        "nlcd": 43,
                        "type": "Mixed Forest"
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
                        "active_river_area": 260,
                        "area": 684,
                        "code": "grassland",
                        "coverage": 0.005517374891104443,
                        "nlcd": 71,
                        "type": "Grassland/Herbaceous"
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
                ],
                "displayName": "Land Use/Cover 2011 (NLCD11)",
                "name": "land_2011_2011"
            }
        }

        actual = tasks.analyze_nlcd(histogram, nlcd_year='2011_2011')
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

    def test_analyze_climate(self):
        histogram = {'nocache': {
            'ppt__1': {'List(0)': 86.10894775390625},
            'ppt__2': {'List(0)': 77.05979919433594},
            'ppt__3': {'List(0)': 97.3456802368164},
            'ppt__4': {'List(0)': 92.16392517089844},
            'ppt__5': {'List(0)': 92.18870544433594},
            'ppt__6': {'List(0)': 98.5276107788086},
            'ppt__7': {'List(0)': 114.81684112548828},
            'ppt__8': {'List(0)': 118.24303436279297},
            'ppt__9': {'List(0)': 93.80207061767578},
            'ppt__10': {'List(0)': 82.33834075927734},
            'ppt__11': {'List(0)': 79.2877426147461},
            'ppt__12': {'List(0)': 91.07259368896484},
            'tmean__1': {'List(0)': 0.7002114057540894},
            'tmean__2': {'List(0)': 1.3823009729385376},
            'tmean__3': {'List(0)': 6.08829927444458},
            'tmean__4': {'List(0)': 11.881658554077148},
            'tmean__5': {'List(0)': 17.683929443359375},
            'tmean__6': {'List(0)': 22.579280853271484},
            'tmean__7': {'List(0)': 25.288223266601562},
            'tmean__8': {'List(0)': 24.355039596557617},
            'tmean__9': {'List(0)': 20.743885040283203},
            'tmean__10': {'List(0)': 14.532132148742676},
            'tmean__11': {'List(0)': 8.510452270507812},
            'tmean__12': {'List(0)': 2.786508560180664},
        }}
        expected = {
            "survey": {
                "categories": [
                    {
                        "month": "January",
                        "monthidx": 1,
                        "ppt": 8.610894775390625,
                        "tmean": 0.7002114057540894
                    },
                    {
                        "month": "February",
                        "monthidx": 2,
                        "ppt": 7.705979919433594,
                        "tmean": 1.3823009729385376
                    },
                    {
                        "month": "March",
                        "monthidx": 3,
                        "ppt": 9.734568023681641,
                        "tmean": 6.08829927444458
                    },
                    {
                        "month": "April",
                        "monthidx": 4,
                        "ppt": 9.216392517089844,
                        "tmean": 11.881658554077148
                    },
                    {
                        "month": "May",
                        "monthidx": 5,
                        "ppt": 9.218870544433594,
                        "tmean": 17.683929443359375
                    },
                    {
                        "month": "June",
                        "monthidx": 6,
                        "ppt": 9.85276107788086,
                        "tmean": 22.579280853271484
                    },
                    {
                        "month": "July",
                        "monthidx": 7,
                        "ppt": 11.481684112548828,
                        "tmean": 25.288223266601562
                    },
                    {
                        "month": "August",
                        "monthidx": 8,
                        "ppt": 11.824303436279298,
                        "tmean": 24.355039596557617
                    },
                    {
                        "month": "September",
                        "monthidx": 9,
                        "ppt": 9.380207061767578,
                        "tmean": 20.743885040283203
                    },
                    {
                        "month": "October",
                        "monthidx": 10,
                        "ppt": 8.233834075927735,
                        "tmean": 14.532132148742676
                    },
                    {
                        "month": "November",
                        "monthidx": 11,
                        "ppt": 7.92877426147461,
                        "tmean": 8.510452270507812
                    },
                    {
                        "month": "December",
                        "monthidx": 12,
                        "ppt": 9.107259368896484,
                        "tmean": 2.786508560180664
                    }
                ],
                "displayName": "Climate",
                "name": "climate"
            }
        }

        actual = tasks.analyze_climate(histogram, 'nocache')
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

    @skip('Disabling until Django Upgrade #3419')
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

    @skip('Disabling until Django Upgrade #3419')
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

    @skip('Disabling until Django Upgrade #3419')
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


class ExerciseModeling(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user', password='user',
                                             email='user@azavea.com')

        self.token = Token.objects.get(user=self.user)

        self.aoi = json.dumps({
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
        })

        self.gwlfe_incomplete_input = json.dumps({
            "SeepCoef": 0,
        })

    def send_request(self, url, data):
        client = Client()

        return client.post(url, data=json.dumps(data),
                           content_type='application/json',
                           HTTP_AUTHORIZATION=f'Token {self.token}')

    def send_gwlfe_prepare(self, data):
        return self.send_request(
            reverse('geoprocessing_api:start_modeling_gwlfe_prepare'), data)

    def test_modeling_gwlfe_prepare_multiple_aois_rejected(self):
        response = self.send_gwlfe_prepare({
            'area_of_interest': self.aoi,
            'wkaoi': 'huc12__55174',
            'huc': '020402031008',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'area_of_interest': self.aoi,
            'wkaoi': 'huc12__55174',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'area_of_interest': self.aoi,
            'huc': '020402031008',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'wkaoi': 'huc12__55174',
            'huc': '020402031008',
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_gwlfe_prepare_missing_aoi_rejected(self):
        response = self.send_gwlfe_prepare({})
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'bad': 'key'
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_gwlfe_prepare_invalid_aoi_rejected(self):
        response = self.send_gwlfe_prepare({
            'area_of_interest': 'not geojson'
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'wkaoi': 'not wkaoi'
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_prepare({
            'huc': 'not huc'
        })
        self.assertEqual(response.status_code, 400)

    def send_gwlfe_run(self, data):
        return self.send_request(
            reverse('geoprocessing_api:start_modeling_gwlfe_run'), data)

    def test_modeling_gwlfe_run_multiple_inputs(self):
        response = self.send_gwlfe_run({
            'input': {
                "SeepCoef": 0,
            },
            'job_uuid': 'cbed307e-4046-4889-b6fb-658080186ae6',
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_gwlfe_run_invalid_inputs(self):
        response = self.send_gwlfe_run({
            'input': {
                "SeepCoef": 0,
            },
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_gwlfe_run({
            'job_uuid': 'not uuid'
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_gwlfe_run_nonready_jobs(self):
        job_uuid = 'cbed307e-4046-4889-b6fb-658080186ae6'
        response = self.send_gwlfe_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 404)

        job = Job.objects.create(uuid=job_uuid, created_at=now())
        job.status = JobStatus.STARTED
        job.save()

        response = self.send_gwlfe_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 428)

        job.status = JobStatus.FAILED
        job.save()

        response = self.send_gwlfe_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 412)

    def send_subbasin_prepare(self, data):
        return self.send_request(
            reverse('geoprocessing_api:start_modeling_subbasin_prepare'), data)

    def test_modeling_subbasin_prepare_multiple_aois_rejected(self):
        response = self.send_subbasin_prepare({
            'wkaoi': 'huc12__55174',
            'huc': '020402031008',
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_subbasin_prepare_geojson_aoi_rejected(self):
        response = self.send_subbasin_prepare({
            'area_of_interest': self.aoi,
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_subbasin_prepare_invalid_huc_rejected(self):
        response = self.send_subbasin_prepare({
            'huc': '020402',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_subbasin_prepare({
            'huc': '0204020310081012',
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_subbasin_prepare_invalid_wkaoi_rejected(self):
        response = self.send_subbasin_prepare({
            'wkaoi': 'huc12__',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_subbasin_prepare({
            'wkaoi': '__1234',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_subbasin_prepare({
            'wkaoi': 'huc6__1',
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_subbasin_prepare({
            'wkaoi': 'school__1',
        })
        self.assertEqual(response.status_code, 400)

    def send_subbasin_run(self, data):
        return self.send_request(
            reverse('geoprocessing_api:start_modeling_subbasin_run'), data)

    def test_modeling_subbasin_run_invalid_inputs(self):
        response = self.send_subbasin_run({
            'input': {
                "SeepCoef": 0,
            },
        })
        self.assertEqual(response.status_code, 400)

        response = self.send_subbasin_run({
            'job_uuid': 'not uuid'
        })
        self.assertEqual(response.status_code, 400)

    def test_modeling_subbasin_run_nonready_jobs(self):
        job_uuid = 'cbed307e-4046-4889-b6fb-658080186ae6'
        response = self.send_subbasin_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 404)

        job = Job.objects.create(uuid=job_uuid, created_at=now())
        job.status = JobStatus.STARTED
        job.save()

        response = self.send_subbasin_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 428)

        job.status = JobStatus.FAILED
        job.save()

        response = self.send_subbasin_run({
            'job_uuid': job_uuid
        })
        self.assertEqual(response.status_code, 412)


class ExerciseModelingModifications(TestCase):
    def test_modifications_are_applied_correctly(self):
        gms_json = join(dirname(abspath(__file__)),
                        'tests/gwlfe-prepare-huc12__55174.json')
        with open(gms_json) as f:
            gwlfe_input = json.load(f)

        # Baseline
        self.assertNotEqual(gwlfe_input['Area'][10], 1122.6449285434453)
        self.assertNotEqual(gwlfe_input['CN'][1], 80.38481449550069)
        self.assertNotEqual(gwlfe_input['n73'], 0.29)
        self.assertNotEqual(gwlfe_input['n24b'], 2639.642634937583)

        # Generated from the front-end by setting Land Cover to NLCD11 2011,
        # and No-Till Agriculture to 5 acres
        modifications = [{
            'entry_landcover_preset': 'land_2011_2011',
            'Area__0': 15.305929733931002,
            'Area__1': 4.141604516240153,
            'Area__2': 313.50145490322205,
            'Area__3': 138.11350712853036,
            'Area__6': 19.987743534898133,
            'Area__7': 1.260488331029612,
            'Area__10': 1122.6449285434453,
            'Area__11': 2639.642634937583,
            'Area__12': 2837.9894773131714,
            'Area__13': 1118.3232542656292,
            'CN__1': 80.38481449550069,
            'n26': 48.8561858590235,
            'n65': 0.22,
            'n73': 0.29,
            'n81': 0.4
        }]

        modded_input = apply_gwlfe_modifications(gwlfe_input, modifications)

        # Changed directly
        self.assertEqual(modded_input['Area'][10], 1122.6449285434453)
        self.assertEqual(modded_input['CN'][1], 80.38481449550069)
        self.assertEqual(modded_input['n73'], 0.29)

        # Changed indirectly
        self.assertEqual(modded_input['n24b'], 2639.642634937583)


class ExerciseRWD(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='user', password='user',
                                             email='user@element84.com')

        self.token = Token.objects.get(user=self.user)

    def send_request(self, data):
        client = Client()
        url = reverse('geoprocessing_api:start_rwd')

        return client.post(url, data=json.dumps(data),
                           content_type='application/json',
                           HTTP_AUTHORIZATION=f'Token {self.token}')

    def test_outside_conus_denied(self):
        data = {
            "location": [  # Indore, MP, India
                75.857727,
                22.7196
            ],
            "snappingOn": True,
            "simplify": 0.0001,
            "dataSource": "drb"
        }

        response = self.send_request(data)
        self.assertEqual(response.status_code, 400)
