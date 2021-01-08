# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib.auth.models import User

from django.test import TestCase

from rest_framework.test import APIClient


class RouteAccessTestCase(TestCase):
    def setUp(self):
        self.c = APIClient()

        self.test_user = User.objects.create_user(username='test',
                                                  email='test@azavea.com',
                                                  password='test')

        self.another_user = User.objects.create_user(username='foo',
                                                     email='test@azavea.com',
                                                     password='bar')
        self.project = {
            "area_of_interest": {
                "type": "MultiPolygon",
                "coordinates": [[[
                    [-75.16030455947867, 39.95694877899765],
                    [-75.14857505439767, 39.95694877899765],
                    [-75.14857505439767, 39.9659391727703],
                    [-75.16030455947867, 39.9659391727703],
                    [-75.16030455947867, 39.95694877899765]]]]},
            "name": "My Project",
            "model_package": "tr-55"
        }

        self.scenario = {
            "name": "Current Conditions",
            "is_current_conditions": True,
            "modifications": "[]"
        }

        self.c.login(username='test', password='test')

    def test_logged_in_user_can_get_project_listing(self):
        response = self.c.get('/projects/')

        self.assertEqual(response.status_code, 200)

    def test_anon_user_getting_listing_redirects_to_home(self):
        self.c.logout()

        response = self.c.get('/projects/')

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/')

    def test_getting_model_route_without_project_id_redirects_to_listing(self):
        response = self.c.get('/project/')

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/projects/')

        self.c.logout()

        response = self.c.get('/project/')

        self.assertEqual(response.status_code, 302)
        self.assertEqual(response.url, '/projects/')

    def test_project_owner_can_get_model_route_with_project_id(self):
        project_id = self.create_private_project()

        response = self.c.get('/project/' + project_id + '/')

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_can_get_model_route_for_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/project/' + project_id + '/')

        self.assertEqual(response.status_code, 200)

    def test_logged_in_user_cant_get_model_route_for_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/project/' + project_id + '/')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_can_get_model_route_for_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.get('/project/' + project_id + '/')

        self.assertEqual(response.status_code, 200)

    def test_anon_user_cant_get_model_route_for_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()

        response = self.c.get('/project/' + project_id + '/')

        self.assertEqual(response.status_code, 404)

    def test_anon_user_cant_clone_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()

        response = self.c.get('/project/' + project_id + '/clone')

        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_cant_clone_private_project(self):
        project_id = self.create_private_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/project/' + project_id + '/clone')
        self.assertEqual(response.status_code, 404)

    def test_logged_in_user_can_clone_public_project(self):
        project_id = self.create_public_project()

        self.c.logout()
        self.c.login(username='foo', password='bar')

        response = self.c.get('/project/' + project_id + '/clone')

        self.assertEqual(response.status_code, 302)
        cloned_project_id = response.url.rsplit('/', 1)[1]

        clone_response = self.c.get('/mmw/modeling/projects/' +
                                    cloned_project_id, format='json')

        self.assertEqual(clone_response.status_code, 200)
        self.assertEqual(clone_response.data['user']['id'],
                         self.another_user.id)

    def test_logged_in_user_can_clone_own_project(self):
        project_id = self.create_private_project()

        response = self.c.get('/project/' + project_id + '/clone')

        self.assertEqual(response.status_code, 302)
        cloned_project_id = response.url.rsplit('/', 1)[1]

        clone_response = self.c.get('/mmw/modeling/projects/' +
                                    cloned_project_id, format='json')

        self.assertEqual(clone_response.status_code, 200)
        self.assertEqual(clone_response.data['user']['id'], self.test_user.id)

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
