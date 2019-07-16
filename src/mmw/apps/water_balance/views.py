# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.shortcuts import render


def home_page(request):
    return render(request, 'home_page/index.html')
