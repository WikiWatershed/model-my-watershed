# -*- coding: utf-8 -*-
from rest_framework import status

from django.http import JsonResponse
from django.core.cache import caches
from django.db import connections

from mmw.middleware import bypass_middleware

import uuid


@bypass_middleware
def health_check(request):
    response = {}

    for check in [_check_cache, _check_database]:
        response.update(check())

    if all([x[0]['default']['ok'] for x in response.values()]):
        return JsonResponse(response, status=status.HTTP_200_OK)
    else:
        return JsonResponse(response,
                            status=status.HTTP_503_SERVICE_UNAVAILABLE)


def _check_cache(cache='default'):
    key = 'health-check-{}'.format(uuid.uuid4())

    try:
        caches[cache].set(key, uuid.uuid4())

        # Loss of connectivity to Redis does not always throw an
        # exception because DJANGO_REDIS_IGNORE_EXCEPTIONS is True.
        if caches[cache].get(key) is None:
            response = {cache: {'ok': False}}
        else:
            response = {cache: {'ok': True}}
            caches[cache].delete(key)
    except Exception as e:
        response = {
            cache: {
                'ok': False,
                'msg': str(e)
            },
        }

    return {'caches': [response]}


def _check_database(database='default'):
    try:
        connections[database].introspection.table_names()

        response = {database: {'ok': True}}
    except Exception as e:
        response = {
            database: {
                'ok': False,
                'msg': str(e)
            },
        }

    return {'databases': [response]}
