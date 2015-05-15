# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.contrib import admin
from .models import Project, Scenario

admin.site.register(Project)
admin.site.register(Scenario)
