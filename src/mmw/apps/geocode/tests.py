# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from urllib.parse import urlencode

from django.test import TestCase, Client
from django.urls import reverse


class GeocodeTestCase(TestCase):
    SEARCH_URL = reverse('geocode:geocode')

    def assert_candidate_exists_for(self, address):
        c = Client()
        url = '{}?{}'.format(self.SEARCH_URL, urlencode({'search': address}))
        response = c.get(url).json()

        self.assertTrue(len(response) > 0, 'Expected '
                        'at least 1 candidate in the response')

    def test_geocoder_returns_a_gazetteer_response(self):
        self.assert_candidate_exists_for('The White House')

    def test_geocoder_returns_an_address_response(self):
        self.assert_candidate_exists_for('320 north 12th st philadelphia')
