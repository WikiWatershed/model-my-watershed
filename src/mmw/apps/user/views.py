from rest_framework.response import Response
from django.contrib.auth import authenticate, login

from rest_framework import decorators
from rest_framework.permissions import AllowAny


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def ajax_login(request):
    response_data = {}
    status = 200

    if request.method == 'POST':
            user = authenticate(username=request.REQUEST.get('username'),
                                password=request.REQUEST.get('password'))

            if user is not None and user.is_active:
                login(request, user)
                response_data['result'] = 'success'
                response_data['username'] = user.username
            else:
                response_data['result'] = 'error'
                status = 400
    else:
        response_data['result'] = 'invalid'
        status = 400

    return Response(data=response_data, status=status)
