# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals

import sys
import rollbar

from django.utils.timezone import now

from apps.core.models import RequestLog


def log_request(view):
    """
    Log the request and its response as a RequestLog model
    """

    def decorator(request, *args, **kwargs):
        requested_at = now()

        view_result = view(request, *args, **kwargs)

        user = request.user if request.user.is_authenticated() else None

        response_time = now() - requested_at
        response_ms = int(response_time.total_seconds() * 1000)

        log = RequestLog.objects.create(
            user=user,
            job_uuid=view_result.data.get('job', None),
            requested_at=requested_at,
            response_ms=response_ms,
            status_code=view_result.status_code,
            path=request.path,
            query_params=request.query_params.dict(),
            method=request.method,
            host=request.get_host(),
            remote_addr=_get_remote_addr(request))
        try:
            log.save()
        except Exception:
            pass

        return view_result

    decorator.__name__ = view.__name__
    decorator.__dict__ = view.__dict__
    decorator.__doc__ = view.__doc__

    return decorator


def _get_remote_addr(request):
    # get IP
    ipaddr = request.META.get("HTTP_X_FORWARDED_FOR", None)
    if ipaddr:
        # X_FORWARDED_FOR returns client1, proxy1, proxy2,...
            return [x.strip() for x in ipaddr.split(",")][0]
    else:
        return request.META.get("REMOTE_ADDR", "")
