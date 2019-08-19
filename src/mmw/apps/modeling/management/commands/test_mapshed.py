import unittest
import json

from os.path import join, dirname, abspath

from django.core.management.base import BaseCommand
from django.test import tag

from dictdiffer import diff

from apps.modeling.mapshed import tasks


class Command(BaseCommand):
    def handle(self, **options):
        suite = unittest.TestLoader().loadTestsFromTestCase(TestMapshed)
        unittest.TextTestRunner().run(suite)


class TestMapshed(unittest.TestCase):
    def setUp(self):
        with open(join(dirname(abspath(__file__)),
                  'test_data/huc12__55174.geojson')) as f:
            self.geojson = f.read()
        with open(join(dirname(abspath(__file__)),
                  'test_data/geop-results-list.json')) as f:
            self.geop_results = json.load(f)
        with open(join(dirname(abspath(__file__)),
                  'test_data/mapshed-dict.json')) as f:
            self.z = json.load(f)

    @tag('mapshed')
    def test_collect_data(self):
        z = tasks.collect_data(self.geop_results, self.geojson)

        diffs = list(diff(self.z, z, tolerance=1e-15))

        self.assertEqual(diffs, [])
