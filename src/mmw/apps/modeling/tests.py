# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from apps.core.models import Job
from apps.modeling import views

from django.test import TestCase
from django.test.utils import override_settings
from django.utils.timezone import now


class TaskRunnerTestCase(TestCase):
    @override_settings(CELERY_ALWAYS_EAGER=True)
    def test_tr55_job_runs_in_chain(self):
        model_input = 'TEST'
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
