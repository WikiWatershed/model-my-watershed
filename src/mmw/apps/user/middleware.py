# -*- coding: utf-8 -*-

from django.conf import settings

EMBED_FLAG = settings.ITSI['embed_flag']


class ItsiEmbedMiddleware(object):
    """
    Middleware for setting itsi session flag
    """

    def process_request(self, request):
        """
        Check if ITSI EMBED FLAG is set, and if so set session flag
        """

        if request.GET.get(EMBED_FLAG, 'false') == 'true':
            request.session[EMBED_FLAG] = True
