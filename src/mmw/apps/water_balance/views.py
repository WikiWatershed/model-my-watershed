# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

from django.shortcuts import render_to_response
from django.template import RequestContext


def home_page(request):
    return render_to_response('home_page/index.html', RequestContext(request))
