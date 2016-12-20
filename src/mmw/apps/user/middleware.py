# -*- coding: utf-8 -*-

from django.conf import settings


EMBED_FLAG = settings.ITSI['embed_flag']


class ItsiAuthenticationMiddleware(object):
    """
    Middleware for setting relevant ITSI flags.
    """

    def process_request(self, request):
        # If flag is set then set a session variable so it can be passed to
        # front-end
        if request.GET.get(EMBED_FLAG, 'false') == 'true':
            request.session[EMBED_FLAG] = True
