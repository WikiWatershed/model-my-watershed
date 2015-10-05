# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.core.models import Job
from apps.modeling import views
from apps.modeling import geoprocessing
from django.contrib.auth.models import User

from django.test import TestCase
from django.test.utils import override_settings
from django.utils.timezone import now

from rest_framework.test import APIClient

from celery import chain, shared_task


@shared_task
def get_test_histogram():
    return {
        'pixel_width': 33,
        'histogram': [[
            [[24, 2], 268],
            [[24, 4], 279],
            [[21, 4], 5],
            [[22, 4], 16],
            [[23, 4], 322],
            [[22, 2], 35],
            [[22, 1], 55],
            [[23, 2], 339],
            [[21, 1], 22],
            [[24, 1], 537],
            [[21, 2], 1],
            [[23, 1], 773]]
        ]
    }


class ExerciseGeoprocessing(TestCase):
    def setUp(self):
        self.histogram = [
            ((11, 1), 434),
            ((82, 4), 202),
            ((23, 4), 1957),
            ((22, 1), 12977),
            ((90, 2), 1090),
            ((81, 2), 1716),
            ((52, 2), 1090),
            ((90, 1), 2190),
            ((43, 4), 745),
            ((11, 2), 162),
            ((24, 4), 320),
            ((71, 1), 91),
            ((81, 4), 1717),
            ((41, 1), 13731),
            ((22, 4), 6470),
            ((82, 1), 392),
            ((21, 4), 12472),
            ((31, 4), 20),
            ((82, 2), 197),
            ((24, 2), 352),
            ((22, 2), 6484),
            ((41, 2), 7140),
            ((52, 1), 2103),
            ((21, 2), 12763),
            ((42, 4), 675),
            ((21, 1), 24709),
            ((71, 2), 54),
            ((42, 1), 1406),
            ((23, 2), 2026),
            ((41, 4), 7231),
            ((24, 1), 640),
            ((52, 4), 1022),
            ((71, 4), 46),
            ((23, 1), 3886),
            ((43, 1), 1490),
            ((81, 1), 3298),
            ((90, 4), 1093),
            ((42, 2), 715),
            ((11, 4), 132),
            ((31, 2), 25),
            ((31, 1), 37),
            ((43, 2), 800)
        ]

    def test_census(self):
        expected = {
            "distribution": {
                "a:barren_land": {"cell_count": 37},
                "b:deciduous_forest": {"cell_count": 7140},
                "a:shrub": {"cell_count": 2103},
                "b:mixed_forest": {"cell_count": 800},
                "a:developed_open": {"cell_count": 24709},
                "b:grassland": {"cell_count": 54},
                "b:open_water": {"cell_count": 162},
                "d:open_water": {"cell_count": 132},
                "a:deciduous_forest": {"cell_count": 13731},
                "a:developed_high": {"cell_count": 640},
                "b:evergreen_forest": {"cell_count": 715},
                "d:developed_open": {"cell_count": 12472},
                "a:developed_low": {"cell_count": 12977},
                "a:cultivated_crops": {"cell_count": 392},
                "d:developed_high": {"cell_count": 320},
                "b:woody_wetlands": {"cell_count": 1090},
                "b:developed_med": {"cell_count": 2026},
                "d:grassland": {"cell_count": 46},
                "d:developed_low": {"cell_count": 6470},
                "d:cultivated_crops": {"cell_count": 202},
                "b:pasture": {"cell_count": 1716},
                "a:evergreen_forest": {"cell_count": 1406},
                "d:pasture": {"cell_count": 1717},
                "a:open_water": {"cell_count": 434},
                "b:cultivated_crops": {"cell_count": 197},
                "a:mixed_forest": {"cell_count": 1490},
                "d:barren_land": {"cell_count": 20},
                "d:woody_wetlands": {"cell_count": 1093},
                "b:barren_land": {"cell_count": 25},
                "d:shrub": {"cell_count": 1022},
                "b:developed_open": {"cell_count": 12763},
                "b:developed_low": {"cell_count": 6484},
                "d:mixed_forest": {"cell_count": 745},
                "a:developed_med": {"cell_count": 3886},
                "d:developed_med": {"cell_count": 1957},
                "d:deciduous_forest": {"cell_count": 7231},
                "a:pasture": {"cell_count": 3298},
                "b:developed_high": {"cell_count": 352},
                "a:grassland": {"cell_count": 91},
                "a:woody_wetlands": {"cell_count": 2190},
                "b:shrub": {"cell_count": 1090},
                "d:evergreen_forest": {"cell_count": 675}
            },
            "cell_count": 136100
        }
        actual = geoprocessing.data_to_census(self.histogram)
        self.assertEqual(actual, expected)

    def test_survey(self):
        self.maxDiff = None
        expected = [
            {
                "displayName": "Land",
                "name": "land",
                "categories": [
                    {
                        "nlcd": 90,
                        "type": "Woody Wetlands",
                        "coverage": 0.03213078618662748,
                        "area": 4373
                    },
                    {
                        "nlcd": 23,
                        "type": "Developed, Medium Intensity",
                        "coverage": 0.057817781043350475,
                        "area": 7869
                    },
                    {
                        "nlcd": 31,
                        "type": "Barren Land (Rock/Sand/Clay)",
                        "coverage": 0.0006024981631153563,
                        "area": 82
                    },
                    {
                        "nlcd": 22,
                        "type": "Developed, Low Intensity",
                        "coverage": 0.19052902277736958,
                        "area": 25931
                    },
                    {
                        "nlcd": 95,
                        'type': 'Emergent Herbaceous Wetlands',
                        'coverage': 0.0,
                        'area': 0
                    },
                    {
                        "nlcd": 41,
                        "type": "Deciduous Forest",
                        "coverage": 0.20648052902277736,
                        "area": 28102
                    },
                    {
                        "nlcd": 11,
                        "type": "Open Water",
                        "coverage": 0.005349008082292432,
                        "area": 728
                    },
                    {
                        "nlcd": 43,
                        "type": "Mixed Forest",
                        "coverage": 0.022299779573842764,
                        "area": 3035
                    },
                    {
                        "nlcd": 12,
                        'type': 'Perennial Ice/Snow',
                        'coverage': 0.0,
                        'area': 0
                    },
                    {
                        "nlcd": 24,
                        "type": "Developed, High Intensity",
                        "coverage": 0.009639970609845701,
                        "area": 1312
                    },
                    {
                        "nlcd": 52,
                        "type": "Shrub/Scrub",
                        "coverage": 0.03096987509184423,
                        "area": 4215
                    },
                    {
                        "nlcd": 82,
                        "type": "Cultivated Crops",
                        "coverage": 0.005811903012490816,
                        "area": 791
                    },
                    {
                        "nlcd": 71,
                        "type": "Grassland/Herbaceous",
                        "coverage": 0.0014033798677443056,
                        "area": 191
                    },
                    {
                        "nlcd": 42,
                        "type": "Evergreen Forest",
                        "coverage": 0.020543717854518737,
                        "area": 2796
                    },
                    {
                        "nlcd": 21,
                        "type": "Developed, Open Space",
                        "coverage": 0.3669654665686995,
                        "area": 49944
                    },
                    {
                        "nlcd": 81,
                        "type": "Pasture/Hay",
                        "coverage": 0.04945628214548126,
                        "area": 6731
                    }]
            },
            {
                "displayName": "Soil",
                "name": "soil",
                "categories": [
                    {
                        "type": "B - Moderate Infiltration",
                        "coverage": 0.25432770022042617,
                        "area": 34614
                    },
                    {
                        "type": "A - High Infiltration",
                        "coverage": 0.49510653930933135,
                        "area": 67384
                    },
                    {
                        "type": "D - Very Slow Infiltration",
                        "coverage": 0.2505657604702425,
                        "area": 34102
                    }
                ]
            }]

        actual = geoprocessing.data_to_survey(self.histogram)
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
        self.assertTrue('tasks.start_histograms_job' in str(job_chain[0]))
        self.assertTrue('tasks.get_histogram_job_results' in str(job_chain[1]))

        # Modify the chain to prevent it from trying to talk to endpoint
        job_chain = [get_test_histogram.s()] + job_chain[2:]
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
        self.assertTrue('tasks.start_histograms_job' in str(job_chain[0]))
        self.assertTrue('tasks.get_histogram_job_results' in str(job_chain[1]))
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
            'start_histograms_job',
            'get_histogram_job_results',
            'histograms_to_censuses'
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
            'start_histograms_job',
            'get_histogram_job_results',
            'histograms_to_censuses',
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

        self.assertTrue(cached_argument in str(job_chain[3]))

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
            'start_histograms_job',
            'get_histogram_job_results',
            'histograms_to_censuses',
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
            'start_histograms_job',
            'get_histogram_job_results',
            'histograms_to_censuses',
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
            'start_histograms_job',
            'get_histogram_job_results',
            'histograms_to_censuses',
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
