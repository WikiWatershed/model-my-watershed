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

    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_job_runs_in_chain(self):
        model_input = {
            'modifications': [
                {
                    'name': 'precipitation',
                    'value': 1.2
                }
            ],
            'precip': 1.0
        }

        created = now()
        job = Job.objects.create(created_at=created, result='', error='',
                                 traceback='', user=None, status='started')
        job.save()

        task_list = views._initiate_tr55_job_chain(model_input, job.id)

        found_job = Job.objects.get(uuid=task_list.id)

        self.assertEqual(str(found_job.uuid),
                         str(task_list.id),
                         'Job not found')

        self.assertEqual(str(found_job.status),
                         'complete',
                         'Job found but incomplete.')


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
