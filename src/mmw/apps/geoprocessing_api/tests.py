# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.test import TestCase

from apps.geoprocessing_api import tasks


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
