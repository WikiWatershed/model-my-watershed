# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from glob import glob

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.modeling.models import District


class Command(BaseCommand):
    """
    Delete everything in the district table and reload from fixture.
    """

    option_list = BaseCommand.option_list

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Deleting all existing district data')
        District.objects.all().delete()

        self.stdout.write('Importing district data')
        shapes = '/opt/app/apps/modeling/fixtures/district*.json'
        district_fixtures = glob(shapes)
        for fixture in district_fixtures:
            call_command('loaddata', fixture)
