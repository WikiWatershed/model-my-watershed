# -*- coding: utf-8 -*-
from rest_framework import authentication
from rest_framework.authtoken.serializers import AuthTokenSerializer


class AuthTokenSerializerAuthentication(authentication.BaseAuthentication):
    def authenticate(self, request):

        # if the user has made no attempt to add
        # credentials via the request body,
        # pass through so other authentication
        # can be tried
        username = request.data.get('username', None)
        password = request.data.get('password', None)
        if not username and not password:
            return None

        serializer = AuthTokenSerializer(data=request.data,
                                         context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']

        return(user, None)
