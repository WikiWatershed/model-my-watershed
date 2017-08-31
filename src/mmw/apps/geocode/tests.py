# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import requests

from django.test import TestCase


class GeocodeTestCase(TestCase):
    def assert_candidate_exists_for(self, address):
        try:
            response = requests.get(
                'http://localhost:80/mmw/geocode/?search=%s' % address).json()
        except requests.RequestException:
            response = {}

        self.assertTrue(len(response) > 0, 'Expected '
                        'at least 1 candidate in the response')

    def test_geocoder_returns_a_gazetteer_response(self):
        self.assert_candidate_exists_for('The White House')

    def test_geocoder_returns_an_address_response(self):
        self.assert_candidate_exists_for('320 north 12th st philadelphia')
