# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import os

from celery import chain, shared_task

from rest_framework.test import APIClient

from django.conf import settings
from django.contrib.auth.models import User
from django.test import TestCase
from django.test.utils import override_settings
from django.utils.timezone import now

from apps.core.models import Job
from apps.modeling import tasks, views
from apps.modeling.models import Scenario, WeatherType


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
        actual = tasks.nlcd_soil(histogram)
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

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
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

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
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
            'nlcd_soil'
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
            'nlcd_soil',
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
            'nlcd_soil',
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

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
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
            'nlcd_soil',
            'run_tr55'
        ]

        self.assertTrue(all([True if t in str(job_chain)
                             else False for t in skipped_tasks]),
                        'unnecessary job in chain')

        self.assertTrue(all([True if t in str(job_chain)
                            else False for t in needed_tasks]),
                        'missing necessary job in chain')

    @override_settings(CELERY_TASK_ALWAYS_EAGER=True)
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
            'nlcd_soil',
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

        response = self.c.get('/mmw/modeling/projects/')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_get_public_project(self):
        self.create_public_project()

        response = self.c.get('/mmw/modeling/projects/')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_private_project(self):
        project_id = self.create_private_project()

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_public_project(self):
        project_id = self.create_public_project()

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_delete_private_project(self):
        project_id = self.create_private_project()

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 204)

    def test_project_owner_can_delete_public_project(self):
        project_id = self.create_public_project()

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 204)

    def test_logged_in_user_can_get_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/mmw/modeling/projects/' + str(project_id))

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_cant_put_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_get_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_put_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_get_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.get('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_put_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_can_get_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.get('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 200)

    def test_anon_user_cant_put_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.put('/mmw/modeling/projects/' + project_id,
                              self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.delete('/mmw/modeling/projects/' + project_id,
                                 self.project, format='json')

        self.assertEqual(response.status_code, 403)

    def test_project_owner_can_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.get('/mmw/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.get('/mmw/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.put('/mmw/modeling/scenarios/' + scenario_id,
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.put('/mmw/modeling/scenarios/' + scenario_id,
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 200)

    def test_project_owner_can_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        response = self.c.delete('/mmw/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 204)

    def test_project_owner_can_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        response = self.c.delete('/mmw/modeling/scenarios/' + scenario_id)

        self.assertEqual(response.status_code, 204)

    def test_logged_in_user_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/mmw/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_cant_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/mmw/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/mmw/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/mmw/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.put('/mmw/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.delete('/mmw/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_get_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.get('/mmw/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_put_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.put('/mmw/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_private_scenario(self):
        scenario_id = self.create_private_scenario()

        self.c.logout()

        response = self.c.delete('/mmw/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_can_get_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.get('/mmw/modeling/scenarios/' + str(scenario_id))

        self.assertEqual(response.status_code, 200)

    def test_anon_user_cant_put_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.put('/mmw/modeling/scenarios/' + str(scenario_id),
                              self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_anon_user_cant_delete_public_scenario(self):
        scenario_id = self.create_public_scenario()

        self.c.logout()

        response = self.c.delete('/mmw/modeling/scenarios/' + str(scenario_id),
                                 self.scenario, format='json')

        self.assertEqual(response.status_code, 403)

    def test_boundary_layer_details_returns_404_with_bad_table_code(self):
        """Table code should match an item in layer_settings code field"""
        response = self.c.put('/api/boundary-layers/foo/1234', format='json')

        self.assertEqual(response.status_code, 404)

    def create_public_project(self):
        self.project['is_private'] = False
        response = self.c.post('/mmw/modeling/projects/', self.project,
                               format='json')

        project_id = str(response.data['id'])

        return project_id

    def create_private_project(self):
        response = self.c.post('/mmw/modeling/projects/', self.project,
                               format='json')

        project_id = str(response.data['id'])

        return project_id

    def create_public_scenario(self):
        project_id = self.create_public_project()
        self.scenario['project'] = project_id

        response = self.c.post('/mmw/modeling/scenarios/', self.scenario,
                               format='json')

        scenario_id = str(response.data['id'])

        return scenario_id

    def create_private_scenario(self):
        project_id = self.create_private_project()
        self.scenario['project'] = project_id

        response = self.c.post('/mmw/modeling/scenarios/', self.scenario,
                               format='json')

        scenario_id = str(response.data['id'])

        return scenario_id


class CustomWeatherDataTestCase(TestCase):

    """Test the custom weather dataset API."""

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
            "model_package": "gwlfe"
        }

        self.scenario = {
            "name": "New Scenario",
            "is_current_conditions": False,
            "inputs": "[]",
            "modifications": "[]"
        }

        self.weather_data_file = open(
            os.path.join(settings.STATIC_ROOT,
                         'resources/weather_data_sample.csv'))

        self.c.login(username='test', password='test')

    def tearDown(self):
        """Remove test uploads when done."""
        scenarios = (
            Scenario.objects.exclude(weather_custom__isnull=True)
                            .distinct('weather_custom'))

        for s in scenarios:
            self.delete_weather_dataset(s.weather_custom)

        self.weather_data_file.close()

    def endpoint(self, scenario_id):
        return '/mmw/modeling/scenarios/{}/custom-weather-data/'\
               .format(scenario_id)

    def download_endpoint(self, scenario_id):
        return '/mmw/modeling/scenarios/{}/custom-weather-data/download/'\
               .format(scenario_id)

    def delete_weather_dataset(self, path):
        """
        Delete weather data at path.

        Only runs if MEDIA_ROOT is defined to prevent accidents.
        """
        if settings.MEDIA_ROOT and path:
                os.remove('{}/{}'.format(settings.MEDIA_ROOT, path))

    def create_private_scenario(self):
        response = self.c.post('/mmw/modeling/projects/', self.project,
                               format='json')
        project_id = str(response.data['id'])

        self.scenario['project'] = project_id
        response = self.c.post('/mmw/modeling/scenarios/', self.scenario,
                               format='json')
        return response.data

    def create_private_scenario_with_weather_data(self):
        scenario = self.create_private_scenario()

        self.c.post(self.endpoint(scenario['id']),
                    {'weather': self.weather_data_file},
                    format='multipart')

        return scenario

    def create_public_scenario_with_weather_data(self):
        scenario = self.create_private_scenario_with_weather_data()

        project_id = scenario['project']

        response = self.c.get('/mmw/modeling/projects/{}'.format(project_id))
        project = response.data
        project['user'] = project['user']['id']
        project['is_private'] = False

        self.c.patch('/mmw/modeling/projects/{}'.format(project_id),
                     project,
                     format='json')

        return scenario

    def create_current_conditions_scenario(self):
        scenario = self.create_private_scenario()

        scenario['name'] = 'Current Conditions'
        scenario['is_current_conditions'] = True

        self.c.put('/mmw/modeling/scenarios/{}'.format(scenario['id']),
                   scenario,
                   format='json')

        return scenario

    # Custom Weather Data Tests

    # GET
    def test_weather_get_project_owner_can_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['output']['WxYrBeg'], 2000)
        self.assertEqual(response.data['output']['WxYrEnd'], 2005)
        self.assertEqual(response.data['output']['WxYrs'], 6)

    def test_weather_get_logged_in_user_cant_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    def test_weather_get_logged_out_user_cant_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        self.c.logout()

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    def test_weather_get_project_owner_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_get_logged_in_user_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_get_logged_out_user_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        self.c.logout()

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_get_missing_data_404s(self):
        scenario = self.create_private_scenario()

        response = self.c.get(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    def test_weather_download_project_owner_can_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_download_logged_in_user_cant_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    def test_weather_download_logged_out_user_cant_get_private(self):
        scenario = self.create_private_scenario_with_weather_data()

        self.c.logout()

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    def test_weather_download_project_owner_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_download_logged_in_user_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_download_logged_out_user_can_get_public(self):
        scenario = self.create_public_scenario_with_weather_data()

        self.c.logout()

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 200)

    def test_weather_download_missing_data_404s(self):
        scenario = self.create_private_scenario()

        response = self.c.get(self.download_endpoint(scenario['id']))

        self.assertEqual(response.status_code, 404)

    # POST
    def test_weather_post_project_owner_can_post(self):
        """
        Test that project owners can overwrite their weather data.

        In the current implementation, old weather data is not automatically
        deleted. We delete it manually at the end of this test.
        """
        scenario = self.create_private_scenario_with_weather_data()
        old_weather = scenario['weather_custom']
        self.weather_data_file.seek(0)

        response = self.c.post(self.endpoint(scenario['id']),
                               {'weather': self.weather_data_file},
                               format='multipart')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['output']['WxYrBeg'], 2000)
        self.assertEqual(response.data['output']['WxYrEnd'], 2005)
        self.assertEqual(response.data['output']['WxYrs'], 6)

        self.delete_weather_dataset(old_weather)

    def test_weather_post_logged_out_user_cant_post(self):
        scenario = self.create_private_scenario_with_weather_data()

        self.c.logout()

        response = self.c.post(self.endpoint(scenario['id']),
                               {'weather': self.weather_data_file},
                               format='multipart')

        self.assertEqual(response.status_code, 403)

    def test_weather_post_missing_weather_400s(self):
        scenario = self.create_private_scenario_with_weather_data()

        response = self.c.post(self.endpoint(scenario['id']), {})

        self.assertEqual(response.status_code, 400)

    def test_weather_post_invalid_weather_400s(self):
        scenario = self.create_private_scenario_with_weather_data()

        response = self.c.post(self.endpoint(scenario['id']),
                               {'XYZ': self.weather_data_file},
                               format='multipart')

        self.assertEqual(response.status_code, 400)

    # PUT
    def test_weather_put_project_owner_can(self):
        scenario = self.create_private_scenario_with_weather_data()
        scenario['weather_type'] = WeatherType.DEFAULT

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data['weather_type'], WeatherType.DEFAULT)
        self.assertNotEqual(response.data['weather_custom'], None)

    def test_weather_put_logged_out_user_cant(self):
        scenario = self.create_private_scenario_with_weather_data()
        scenario['weather_type'] = WeatherType.DEFAULT
        self.c.logout()

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')

        self.assertEqual(response.status_code, 403)

    def test_weather_put_invalid_param_400s(self):
        scenario = self.create_private_scenario_with_weather_data()
        scenario['weather_type'] = 'A_WRONG_VALUE'

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')

        self.assertEqual(response.status_code, 400)

    def test_weather_put_without_weather_data_400s(self):
        scenario = self.create_private_scenario()
        scenario['weather_type'] = WeatherType.CUSTOM

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')
        self.assertEqual(response.status_code, 400)

        scenario['weather_type'] = WeatherType.SIMULATION

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')
        self.assertEqual(response.status_code, 400)

    def test_weather_put_cannot_set_on_current_conditions(self):
        scenario = self.create_current_conditions_scenario()
        scenario['weather_type'] = WeatherType.CUSTOM

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')
        self.assertEqual(response.status_code, 400)

        scenario['weather_type'] = WeatherType.SIMULATION

        response = self.c.put('/mmw/modeling/scenarios/{}'
                              .format(scenario['id']),
                              scenario,
                              format='json')
        self.assertEqual(response.status_code, 400)

    # DELETE
    def test_weather_delete_project_owner_can_delete(self):
        scenario = self.create_private_scenario_with_weather_data()

        response = self.c.delete(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 204)

    def test_weather_delete_logged_out_user_cant_delete(self):
        scenario = self.create_private_scenario_with_weather_data()
        self.c.logout()

        response = self.c.delete(self.endpoint(scenario['id']))

        self.assertEqual(response.status_code, 403)
