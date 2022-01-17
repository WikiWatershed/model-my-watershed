# -*- coding: utf-8 -*-
from django.shortcuts import render


def home_page(request):
    return render(request, 'home_page/index.html')
