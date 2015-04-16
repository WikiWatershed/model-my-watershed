# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from glob import glob

from django.core.management import call_command
from django.core.management.base import BaseCommand
from django.db import transaction

from apps.home.models import District


class Command(BaseCommand):
    """
    Delete everything in the home_district table load it afresh from
    the fixture.
    """

    option_list = BaseCommand.option_list

    @transaction.atomic
    def handle(self, *args, **options):
        self.stdout.write('Deleting all existing district data')
        District.objects.all().delete()

        self.stdout.write('Importing district data')
        district_fixtures = glob('/opt/app/apps/home/fixtures/district*.json')
        for fixture in district_fixtures:
            call_command('loaddata', fixture)
