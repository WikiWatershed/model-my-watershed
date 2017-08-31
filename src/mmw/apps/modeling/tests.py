# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from celery import chain, shared_task

from rest_framework.test import APIClient

from django.contrib.auth.models import User
from django.test import TestCase
from django.test.utils import override_settings
from django.utils.timezone import now

from apps.core.models import Job
from apps.modeling import example_aois, geoprocessing, tasks, views


@shared_task
def get_test_histogram():
    return {
        'List(21,1)': 22,
        'List(21,2)': 1,
        'List(21,4)': 5,
        'List(22,1)': 55,
        'List(22,2)': 35,
        'List(22,4)': 16,
        'List(23,1)': 773,
        'List(23,2)': 339,
        'List(23,4)': 322,
        'List(24,1)': 537,
        'List(24,2)': 268,
        'List(24,4)': 279,
    }


class ExerciseGeoprocessing(TestCase):
    def test_census(self):
        histogram = {
            'List(11, 1)': 434,
            'List(82, 4)': 202,
            'List(23, 4)': 1957,
            'List(22, 1)': 12977,
            'List(90, 2)': 1090,
            'List(81, 2)': 1716,
            'List(52, 2)': 1090,
            'List(90, 1)': 2190,
            'List(43, 4)': 745,
            'List(11, 2)': 162,
            'List(24, 4)': 320,
            'List(71, 1)': 91,
            'List(81, 4)': 1717,
            'List(41, 1)': 13731,
            'List(22, 4)': 6470,
            'List(82, 1)': 392,
            'List(21, 4)': 12472,
            'List(31, 4)': 20,
            'List(82, 2)': 197,
            'List(24, 2)': 352,
            'List(22, 2)': 6484,
            'List(41, 2)': 7140,
            'List(52, 1)': 2103,
            'List(21, 2)': 12763,
            'List(42, 4)': 675,
            'List(21, 1)': 24709,
            'List(71, 2)': 54,
            'List(42, 1)': 1406,
            'List(23, 2)': 2026,
            'List(41, 4)': 7231,
            'List(24, 1)': 640,
            'List(52, 4)': 1022,
            'List(71, 4)': 46,
            'List(23, 1)': 3886,
            'List(43, 1)': 1490,
            'List(81, 1)': 3298,
            'List(90, 4)': 1093,
            'List(42, 2)': 715,
            'List(11, 4)': 132,
            'List(31, 2)': 25,
            'List(31, 1)': 37,
            'List(43, 2)': 800
        }

        expected = [{
            'cell_count': 136100,
            'distribution': {
                'a:barren_land': {'cell_count': 37},
                'a:cultivated_crops': {'cell_count': 392},
                'a:deciduous_forest': {'cell_count': 13731},
                'a:developed_high': {'cell_count': 640},
                'a:developed_low': {'cell_count': 12977},
                'a:developed_med': {'cell_count': 3886},
                'a:developed_open': {'cell_count': 24709},
                'a:evergreen_forest': {'cell_count': 1406},
                'a:grassland': {'cell_count': 91},
                'a:mixed_forest': {'cell_count': 1490},
                'a:open_water': {'cell_count': 434},
                'a:pasture': {'cell_count': 3298},
                'a:shrub': {'cell_count': 2103},
                'a:woody_wetlands': {'cell_count': 2190},
                'b:barren_land': {'cell_count': 25},
                'b:cultivated_crops': {'cell_count': 197},
                'b:deciduous_forest': {'cell_count': 7140},
                'b:developed_high': {'cell_count': 352},
                'b:developed_low': {'cell_count': 6484},
                'b:developed_med': {'cell_count': 2026},
                'b:developed_open': {'cell_count': 12763},
                'b:evergreen_forest': {'cell_count': 715},
                'b:grassland': {'cell_count': 54},
                'b:mixed_forest': {'cell_count': 800},
                'b:open_water': {'cell_count': 162},
                'b:pasture': {'cell_count': 1716},
                'b:shrub': {'cell_count': 1090},
                'b:woody_wetlands': {'cell_count': 1090},
                'd:barren_land': {'cell_count': 20},
                'd:cultivated_crops': {'cell_count': 202},
                'd:deciduous_forest': {'cell_count': 7231},
                'd:developed_high': {'cell_count': 320},
                'd:developed_low': {'cell_count': 6470},
                'd:developed_med': {'cell_count': 1957},
                'd:developed_open': {'cell_count': 12472},
                'd:evergreen_forest': {'cell_count': 675},
                'd:grassland': {'cell_count': 46},
                'd:mixed_forest': {'cell_count': 745},
                'd:open_water': {'cell_count': 132},
                'd:pasture': {'cell_count': 1717},
                'd:shrub': {'cell_count': 1022},
                'd:woody_wetlands': {'cell_count': 1093}
            }
        }]
        actual = tasks.nlcd_soil_census(histogram)
        self.assertEqual(actual, expected)

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


class TaskRunnerTestCase(TestCase):
    def setUp(self):
        self.model_input = {
            'inputs': [
                {
                    'name': 'precipitation',
                    'value': 1.2
                }
            ],
            "inputmod_hash": "f70f743cb92e67cff0eb8f8faa9c0eb6d"
                             "751713988987e9331980363e24189ce",
            'modification_pieces': [{
                'name': 'conservation_practice',
                'shape': {
                    'type': 'Feature',
                    'properties': {},
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [[
                            [-75.09326934814453, 40.10092245173233],
                            [-75.13343811035156, 40.060731050581396],
                            [-75.0637435913086, 40.065460682065535],
                            [-75.0692367553711, 40.095670021782404],
                            [-75.09326934814453, 40.10092245173233]
                        ]]
                    },
                    'value': 'rain_garden'
                }
            }],
            'modifications': [{
                'name': 'conservation_practice',
                'area': 15.683767964377065,
                'value': 'rain_garden',
                'shape': {
                    'geometry': {
                        'type': 'Polygon',
                        'coordinates': [[
                            [-75.09326934814453, 40.10092245173233],
                            [-75.13343811035156, 40.060731050581396],
                            [-75.0637435913086, 40.065460682065535],
                            [-75.0692367553711, 40.095670021782404],
                            [-75.09326934814453, 40.10092245173233]
                        ]]
                    },
                    'type': 'Feature',
                    'properties': {}
                },
                'units': 'km<sup>2</sup>',
                'type': ''
            }],
            'area_of_interest': {
                'type': 'MultiPolygon',
                'coordinates': [[
                    [[-75.06271362304688, 40.15893480687665],
                     [-75.2728271484375, 39.97185812402586],
                     [-74.99130249023438, 40.10958807474143],
                     [-75.06271362304688, 40.15893480687665]]
                ]]
            },
            'aoi_census': None,
            'modification_censuses': None,
            'modification_hash': '4c23321de9e52f12e1b37460afc28db2',
        }

        created = now()
        self.job = Job.objects.create(created_at=created, result='', error='',
                                      traceback='', user=None,
                                      status='started')
        self.job.save()

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_job_runs_in_chain(self):
        # For the purposes of this test, there are no modifications
        self.model_input['modification_pieces'] = []

        # Get the job chain
        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        # Make sure the chain is well-formed
        self.assertTrue('geoprocessing.run' in str(job_chain[0]))

        # Modify the chain to prevent it from trying to talk to endpoint
        job_chain = [get_test_histogram.s()] + job_chain[1:]
        task_list = chain(job_chain).apply_async()

        found_job = Job.objects.get(uuid=task_list.id)

        self.assertEqual(str(found_job.uuid),
                         str(task_list.id),
                         'Job not found')

        self.assertEqual(str(found_job.status),
                         'complete',
                         'Job found but incomplete.')

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_job_error_in_chain(self):
        model_input = {
            'inputs': [],
            'area_of_interest': {
                'type': 'MultiPolygon',
                'coordinates': [[
                    [[-75.06271362304688, 40.15893480687665],
                     [-75.2728271484375, 39.97185812402586],
                     [-74.99130249023438, 40.10958807474143],
                     [-75.06271362304688, 40.15893480687665]]
                ]]
            },
            'modification_pieces': [],
            'modifications': [],
            'modification_hash': 'j39fj9fg7yshb399h4nsdhf'
        }

        job_chain = views._construct_tr55_job_chain(model_input,
                                                    self.job.id)

        self.assertTrue('geoprocessing.run' in str(job_chain[0]))

        job_chain = [get_test_histogram.s()] + job_chain[2:]

        with self.assertRaises(Exception) as context:
            chain(job_chain).apply_async()

        self.assertEqual(str(context.exception),
                         'No precipitation value defined',
                         'Unexpected exception occurred')

    def test_tr55_chain_doesnt_generate_censuses_if_they_exist(self):
        """If the AoI census and modifications exist in the model input,
        and the modification censuses are up-to-date (meaning the hash
        stored with the census matches the model input hash, neither census
        is generated and the censuses are passed directly to the model.
        """
        self.model_input['aoi_census'] = {
            "distribution": {
                "b:developed_med": {"cell_count": 155},
                "a:developed_high": {"cell_count": 1044},
                "b:developed_high": {"cell_count": 543},
                "d:developed_high": {"cell_count": 503},
                "d:developed_med": {"cell_count": 164},
                "a:developed_med": {"cell_count": 295}
            },
            "cell_count": 2704
        }
        self.model_input['modification_censuses'] = {
            "modification_hash": "4c23321de9e52f12e1b37460afc28db2",
            "censuses": [
                {
                    "distribution": {
                        "b:developed_med": {"cell_count": 5},
                        "a:developed_high": {"cell_count": 10},
                        "b:developed_high": {"cell_count": 4},
                        "d:developed_high": {"cell_count": 5},
                        "d:developed_med": {"cell_count": 2},
                        "a:developed_med": {"cell_count": 2}
                    },
                    "cell_count": 28,
                    "change": ":deciduous_forest:"
                }
            ]
        }

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        skipped_tasks = [
            'run',
            'nlcd_soil_census'
        ]

        needed_tasks = [
            'run_tr55'
        ]

        self.assertFalse(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                         'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')

    def test_tr55_chain_doesnt_generate_aoi_census_if_it_exists_and_mods(self):
        """If the AoI census exists in the model input, and there are modifications,
        it should be provided to TR-55 and not generated.
        """
        self.model_input['aoi_census'] = {
            "distribution": {
                "b:developed_med": {"cell_count": 155},
                "a:developed_high": {"cell_count": 1044},
                "b:developed_high": {"cell_count": 543},
                "d:developed_high": {"cell_count": 503},
                "d:developed_med": {"cell_count": 164},
                "a:developed_med": {"cell_count": 295}
            },
            "cell_count": 2704
        }

        skipped_tasks = []

        # Job chain is the same as if no census exists because
        # we still need to generate modification censuses
        needed_tasks = [
            'run',
            'nlcd_soil_census',
            'run_tr55'
        ]

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        cached_argument = ("cached_aoi_census={u'distribution': "
                           "{u'b:developed_med'"
                           ": {u'cell_count': 155}, u'a:developed_high': "
                           "{u'cell_count': 1044}, u'b:developed_high': "
                           "{u'cell_count': 543}, u'd:developed_high': "
                           "{u'cell_count': 503}, u'd:developed_med': "
                           "{u'cell_count': 164}, u'a:developed_med': "
                           "{u'cell_count': 295}}, u'cell_count': 2704})")

        self.assertTrue(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                        'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')

        self.assertTrue(cached_argument in str(job_chain[2]))

    def test_tr55_chain_doesnt_generate_aoi_census_if_it_exists_and_no_mods(self):  # noqa
        """If the AoI census exists in the model input, and there are no modifications,
        it should be provided to TR-55 and not generated.
        """
        self.model_input['aoi_census'] = {
            "distribution": {
                "b:developed_med": {"cell_count": 155},
                "a:developed_high": {"cell_count": 1044},
                "b:developed_high": {"cell_count": 543},
                "d:developed_high": {"cell_count": 503},
                "d:developed_med": {"cell_count": 164},
                "a:developed_med": {"cell_count": 295}
            },
            "cell_count": 2704
        }
        self.model_input['modification_censuses'] = None
        self.model_input['modification_pieces'] = []

        skipped_tasks = [
            'run',
            'nlcd_soil_census',
        ]

        needed_tasks = [
            'run_tr55'
        ]

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        self.assertFalse(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                         'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_chain_generates_modification_censuses_if_they_are_old(self):
        """If they modification censuses exist in the model input, but the
        hash stored with the censuses does not match the hash passed in
        with the model input, the modification censuses are regenerated.
        """
        self.model_input['aoi_census'] = {
            "distribution": {
                "b:developed_med": {"cell_count": 155},
                "a:developed_high": {"cell_count": 1044},
                "b:developed_high": {"cell_count": 543},
                "d:developed_high": {"cell_count": 503},
                "d:developed_med": {"cell_count": 164},
                "a:developed_med": {"cell_count": 295}
            },
            "cell_count": 2704
        }
        self.model_input['modification_censuses'] = {
            "modification_hash": "out-of-date-3jk34n9j3knk3kv",
            "censuses": [
                {
                    "distribution": {
                        "b:developed_med": {"cell_count": 5},
                        "a:developed_high": {"cell_count": 10},
                        "b:developed_high": {"cell_count": 4},
                        "d:developed_high": {"cell_count": 5},
                        "d:developed_med": {"cell_count": 2},
                        "a:developed_med": {"cell_count": 2}
                    },
                    "cell_count": 28,
                    "change": ":deciduous_forest:"
                }
            ]
        }

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        skipped_tasks = []

        needed_tasks = [
            'run',
            'nlcd_soil_census',
            'run_tr55'
        ]

        self.assertTrue(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                        'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_chain_generates_both_censuses_if_they_are_missing(self):
        """If neither the AoI censuses or the modification censuses exist,
        they are both generated.
        """
        self.model_input['aoi_census'] = None
        self.model_input['modification_censuses'] = None

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        skipped_tasks = []

        needed_tasks = [
            'run',
            'nlcd_soil_census',
            'run_tr55'
        ]

        self.assertTrue(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                        'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')


class APIAccessTestCase(TestCase):

    def setUp(self):
        self.c = APIClient()
        self.test_user = User.objects.create_user(username='test',
                                                  email='test@azavea.com',
                                                  password='test')

        self.another_user = User.objects.create_user(username='foo',
                                                     email='test@azavea.com',
                                                     password='bar')
        self.project = {
            "area_of_interest": ("MULTIPOLYGON (((30 20, 45 40, 10 40, 30 20))"
                                 ",((15 5, 40 10, 10 20, 5 10, 15 5)))"),
            "name": "My Project",
            "model_package": "tr-55"
        }

        self.scenario = {
            "name": "Current Conditions",
            "is_current_conditions": True,
            "inputs": "[]",
            "modifications": "[]"
        }

        self.c.login(username='test', password='test')

    def test_project_owner_can_get_private_project(self):
        self.create_private_project()

        response = self.c.get('/api/modeling/projects/')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_get_public_project(self):
        self.create_public_project()

        response = self.c.get('/api/modeling/projects/')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_private_project(self):
        project_id = self.create_private_project()

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_public_project(self):
        project_id = self.create_public_project()

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_delete_private_project(self):
        project_id = self.create_private_project()

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 204)

    def test_project_owner_can_delete_public_project(self):
        project_id = self.create_public_project()

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 204)

    def test_logged_in_user_can_get_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/api/modeling/projects/' + str(project_id))

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_cant_put_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_get_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_put_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_get_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.get('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_put_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_can_get_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.get('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_anon_user_cant_put_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.put('/api/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.delete('/api/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_project_owner_can_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.get('/api/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.get('/api/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.put('/api/modeling/scenarios/' + scenario_id,
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.put('/api/modeling/scenarios/' + scenario_id,
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.delete('/api/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 204)

    def test_project_owner_can_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.delete('/api/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 204)

    def test_logged_in_user_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/api/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_cant_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/api/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/api/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/api/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/api/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/api/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.get('/api/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.put('/api/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.delete('/api/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.get('/api/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 200)

    def test_anon_user_cant_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.put('/api/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.delete('/api/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_boundary_layer_details_returns_404_with_bad_table_code(self):
        """Table code should match an item in layer_settings code field"""
        response = self.c.put('/api/boundary-layers/foo/1234', format='json')

        self.assertEqual(response.status_code, 404)

    def create_public_project(self):
        self.project['is_private'] = False
        response = self.c.post('/api/modeling/projects/', self.project,
                               format='json')

        project_id = str(response.data['id'])

        return project_id

    def create_private_project(self):
        response = self.c.post('/api/modeling/projects/', self.project,
                               format='json')

        project_id = str(response.data['id'])

        return project_id

    def create_public_scenario(self):
        project_id = self.create_public_project()
        self.scenario['project'] = project_id

        response = self.c.post('/api/modeling/scenarios/', self.scenario,
                               format='json')

        scenario_id = str(response.data['id'])

        return scenario_id

    def create_private_scenario(self):
        project_id = self.create_private_project()
        self.scenario['project'] = project_id

        response = self.c.post('/api/modeling/scenarios/', self.scenario,
                               format='json')

        scenario_id = str(response.data['id'])

        return scenario_id


class NormalizeSingleRingPolygonTestCase(TestCase):

    def setUp(self):
        self.drawn_aoi = example_aois.valid_drawn_aoi
        self.sq_km = example_aois.valid_sq_km
        self.non_rwd_multi = example_aois.valid_frontend_multipolygon
        self.single_rwd_multi = example_aois.valid_rwd_multi
        self.multi_rwd_multi = example_aois.invalid_rwd_multi

    def test_valid_drawn_aoi_is_unmodified(self):
        validated = geoprocessing.to_one_ring_multipolygon(self.drawn_aoi)
        self.assertEqual(self.drawn_aoi, validated)

    def test_valid_sq_km_aoi_is_unmodified(self):
        validated = geoprocessing.to_one_ring_multipolygon(self.sq_km)
        self.assertEqual(self.sq_km, validated)

    def test_multi_shape_frontend_aoi_is_unmodified(self):
        validated = geoprocessing.to_one_ring_multipolygon(self.non_rwd_multi)
        self.assertEqual(self.non_rwd_multi, validated)

    def test_single_ring_multipolygon_is_adjusted(self):
        adjusted = geoprocessing.to_one_ring_multipolygon(
            self.single_rwd_multi
        )
        self.assertEqual(len(adjusted['coordinates']), 1)

    def test_single_ring_unmodified_on_revalidation(self):
        validated = geoprocessing.to_one_ring_multipolygon(
            self.single_rwd_multi
        )
        revalidated = geoprocessing.to_one_ring_multipolygon(validated)
        self.assertEqual(validated, revalidated)

    def test_multi_ring_multipolygon_raises_exception(self):
        with self.assertRaises(Exception):
            geoprocessing.to_one_ring_multipolygon(self.multi_rwd_multi)
