# -*- coding: utf-8 -*-
import sys
import rollbar

from django.utils.timezone import now
from django.conf import settings

from apps.core.models import RequestLog


rollbar_settings = getattr(settings, 'ROLLBAR', {})
if rollbar_settings:
    rollbar.init(rollbar_settings.get('access_token'),
                 rollbar_settings.get('environment'))


def log_request(view):
    """
    Log the request and its response as a RequestLog model
    """

    def decorator(request, *args, **kwargs):
        requested_at = now()

        view_result = view(request, *args, **kwargs)

        user = request.user if request.user.is_authenticated else None

        response_time = now() - requested_at
        response_ms = int(response_time.total_seconds() * 1000)

        log = RequestLog.objects.create(
            user=user,
            job_uuid=view_result.data.get('job_uuid', None),
            requested_at=requested_at,
            response_ms=response_ms,
            status_code=view_result.status_code,
            path=request.path,
            query_params=request.query_params.dict(),
            method=request.method,
            host=request.get_host(),
            remote_addr=_get_remote_addr(request),
            referrer=request.META.get('HTTP_REFERER'),
            api=_is_api_call(request))
        try:
            log.save()
        except Exception:
            if rollbar_settings:
                rollbar.report_exc_info(sys.exc_info(), request)

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


def _is_api_call(request):
    # request.auth is None for SessionAuthentication,
    # but a Token instance for TokenAuthentication
    return request.auth is not None
