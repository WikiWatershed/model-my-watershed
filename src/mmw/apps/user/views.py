from rest_framework.response import Response
from django.contrib.auth import authenticate, login
from django.core.urlresolvers import reverse
from django.core.exceptions import ObjectDoesNotExist
from django.shortcuts import redirect

from django.contrib.auth.models import User

from rest_framework import decorators
from rest_framework.permissions import AllowAny

from apps.user.models import ItsiUser
from apps.user.itsi import ItsiService


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


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def itsi_login(request):
    itsi = ItsiService()
    redirect_uri = request.build_absolute_uri(reverse('itsi_auth'))
    params = {'redirect_uri': redirect_uri}
    auth_url = itsi.get_authorize_url(**params)

    return redirect(auth_url)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def itsi_auth(request):
    response_data = {}
    status = 200

    code = request.GET.get('code', None)

    # Basic validation
    if code is None:
        response_data['result'] = 'invalid'
        status = 400
        return Response(data=response_data, status=status)

    itsi = ItsiService()
    session = itsi.get_session_from_code(code)
    itsi_user = session.get_user()

    # Check if user already exists
    try:
        user = ItsiUser.objects.get(itsi_id=itsi_user['id']).user

    except ObjectDoesNotExist:
        # User does not exist, create a new one
        user = User.objects.create_user(
            'itsi_' + itsi_user['extra']['username'],
            itsi_user['info']['email'],
            ''
        )

        user.first_name = itsi_user['extra']['first_name']
        user.last_name = itsi_user['extra']['last_name']

        new_itsi_user = ItsiUser.objects.create_itsi_user(user,
                                                          itsi_user['id'])

        user.save()
        new_itsi_user.save()

    response_data['result'] = 'success'
    response_data['username'] = user.username
    response_data['itsi'] = itsi_user

    return Response(data=response_data, status=status)
