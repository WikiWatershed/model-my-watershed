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

import json


class ExerciseGeoprocessing(TestCase):
    def setUp(self):
        self.polygon = """
{
    "type": "MultiPolygon",
    "coordinates": [
        [
            [
                [-75.61614990234375, 39.78426800449774],
                [-75.67245483398438, 39.715638134796336],
                [-75.56808471679688, 39.743098286948275],
                [-75.61614990234375, 39.78426800449774]
            ]
        ]
    ]
}
"""

    def test_geotrellis_good(self):
        actual = geoprocessing.geotrellis(self.polygon)
        expected = "[[[90, 4], 140], [[41, 4], 967], [[23, 2], 6763], [[81, 3], 203], [[52, 2], 1430], [[42, 2], 1286], [[31, 3], 48], [[24, 3], 472], [[21, 2], 18212], [[42, 3], 41], [[22, 4], 409], [[23, 4], 327], [[82, 3], 113], [[43, 3], 1208], [[82, 2], 49], [[43, 0], 151], [[90, 3], 6507], [[81, 2], 1160], [[21, 3], 5958], [[11, 3], 26], [[24, 0], 5436], [[52, 4], 103], [[31, 2], 128], [[52, 0], 130], [[42, 4], 37], [[11, 2], 97], [[22, 0], 12904], [[22, 2], 20604], [[81, 4], 63], [[23, 3], 1664], [[21, 4], 1316], [[43, 2], 1398], [[43, 4], 128], [[41, 3], 7080], [[24, 4], 80], [[42, 0], 191], [[90, 0], 137], [[22, 3], 2967], [[52, 3], 728], [[11, 0], 1736], [[41, 0], 862], [[41, 2], 12140], [[21, 0], 8088], [[90, 2], 1425], [[23, 0], 4382], [[24, 2], 1787]]"  # noqa
        self.assertEqual(json.loads(actual), json.loads(expected), "Discrepant answer from Geotrellis")  # noqa

    def test_geotrellis_bad(self):
        actual = geoprocessing.geotrellis('this is not valid geojson')
        expected = "Invalid or no GeoJSON."
        self.assertEqual(actual, expected, "Discrepant answer from Geotrellis")

    def test_survey(self):
        actual = geoprocessing.geojson_to_survey(self.polygon)
        expected = '[{"displayName": "Land", "name": "land", "categories": [{"type": "Urban- or Tall-Grass", "coverage": 0.25613170482373493, "area": 33574}, {"type": "Low-Intensity Res.", "coverage": 0.2813832668350104, "area": 36884}, {"type": "Deciduous Forest", "coverage": 0.1605800993278965, "area": 21049}, {"type": "Water", "coverage": 0.014182070628084924, "area": 1859}, {"type": "Mixed Forest", "coverage": 0.022009291964510493, "area": 2885}, {"type": "Industrial &c.", "coverage": 0.05931446967905341, "area": 7775}, {"type": "Desert &c.", "coverage": 0.001342681242895614, "area": 176}, {"type": "Woody Wetland", "coverage": 0.06262539956210282, "area": 8209}, {"type": "High-Intensity Res.", "coverage": 0.10021284549248174, "area": 13136}, {"type": "Evergreen Forest", "coverage": 0.011862893935810682, "area": 1555}, {"type": "Pasture &c.", "coverage": 0.010878769615733783, "area": 1426}, {"type": "Chaparral", "coverage": 0.01824062983956485, "area": 2391}, {"type": "Row Crop", "coverage": 0.0012358770531198267, "area": 162}]}, {"displayName": "Soil", "name": "soil", "categories": [{"type": "C", "coverage": 0.2060939419137785, "area": 27015}, {"type": "B", "coverage": 0.5071596951503269, "area": 66479}, {"type": "D", "coverage": 0.02723506839282581, "area": 3570}, {"type": "?", "coverage": 0.2595112945430688, "area": 34017}]}]'  # noqa
        self.assertEqual(actual, json.loads(expected), "Discrepant survey.")


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
