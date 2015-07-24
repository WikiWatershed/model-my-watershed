# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.core.models import Job
from apps.modeling import views
from django.contrib.auth.models import User

from django.test import TestCase
from django.test.utils import override_settings
from django.utils.timezone import now

from rest_framework.test import APIClient


class TaskRunnerTestCase(TestCase):
    def setUp(self):
        self.model_input = {
            'inputs': [
                {
                    'name': 'precipitation',
                    'value': 1.2
                }
            ],
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
            'modification_hash': '39f488abec2de49f17652631ae843946'
        }

        created = now()
        self.job = Job.objects.create(created_at=created, result='', error='',
                                      traceback='', user=None,
                                      status='started')
        self.job.save()

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_job_runs_in_chain(self):
        task_list = views._initiate_tr55_job_chain(self.model_input,
                                                   self.job.id)

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
            'modifications': [],
            'modification_hash': 'j39fj9fg7yshb399h4nsdhf'
        }

        with self.assertRaises(Exception) as context:
            views._initiate_tr55_job_chain(model_input, self.job.id)

        self.assertEqual(str(context.exception),
                         'No precipitation value defined',
                         'Unexpected exception occurred')

    def test_tr55_chain_skips_census_if_census_is_up_to_date(self):
        # Census with current modification_hash
        self.model_input['census'] = {
            'cell_count': 100,
            'distribution': {
                'c:commercial': {
                    'cell_count': 70
                },
                'a:deciduous_forest': {
                    'cell_count': 30
                }
            },
            'modification_hash': '39f488abec2de49f17652631ae843946',
            'modifications': [{
                'bmp': 'no_till',
                'cell_count': 1,
                'distribution': {
                    'a:deciduous_forest': {'cell_count': 1},
                }
            }]
        }

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        self.assertFalse('tasks.prepare_census' in str(job_chain),
                         'Census preparation should be skipped')

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_chain_generates_census_if_census_is_stale(self):
        # Census with stale modification_hash
        self.model_input['census'] = {
            'cell_count': 100,
            'distribution': {
                'c:commercial': {
                    'cell_count': 70
                },
                'a:deciduous_forest': {
                    'cell_count': 30
                }
            },
            'modification_hash': 'j3jk3jk3jn3knm3nmn39usd',
            'modifications': [{
                'bmp': 'no_till',
                'cell_count': 1,
                'distribution': {
                    'a:deciduous_forest': {'cell_count': 1},
                }
            }]
        }

        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        self.assertTrue('tasks.prepare_census' in str(job_chain),
                        'Census preparation should not be skipped')

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_chain_generates_census_if_census_does_not_exist(self):
        job_chain = views._construct_tr55_job_chain(self.model_input,
                                                    self.job.id)

        self.assertTrue('tasks.prepare_census' in str(job_chain),
                        'Census preparation should not be skipped')


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
