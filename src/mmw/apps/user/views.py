from rest_framework.response import Response
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.shortcuts import redirect

from rest_framework import decorators
from rest_framework.permissions import AllowAny

from apps.user.models import ItsiUser
from apps.user.itsi import ItsiService


@decorators.api_view(['POST', 'GET'])
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
                response_data['guest'] = False
            else:
                response_data['result'] = 'error'
                status = 400
    elif request.method == 'GET':
        user = request.user

        if user.is_authenticated() and user.is_active:
            response_data['username'] = user.username
            response_data['guest'] = False
        else:
            response_data['guest'] = True

        response_data['result'] = 'success'
        status = 200
    else:
        response_data['result'] = 'invalid'
        status = 400

    return Response(data=response_data, status=status)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def ajax_logout(request):
    response_data = {}
    status = 200

    logout(request)

    response_data['guest'] = True
    response_data['result'] = 'success'

    return Response(data=response_data, status=status)


itsi = ItsiService()


def itsi_login(request):
    redirect_uri = request.build_absolute_uri(reverse('itsi_auth'))
    params = {'redirect_uri': redirect_uri}
    auth_url = itsi.get_authorize_url(**params)

    return redirect(auth_url)


def itsi_auth(request):
    code = request.GET.get('code', None)

    # Basic validation
    if code is None:
        return redirect('/error-itsi')  # TODO Make this Backbone route

    try:
        session = itsi.get_session_from_code(code)
        itsi_user = session.get_user()
    except:
        # In case we are unable to reach ITSI and get an unexpected response
        return redirect('/error-itsi')   # TODO Make this Backbone route

    user = authenticate(itsi_id=itsi_user['id'])
    if user is not None and user.is_active:
        login(request, user)
        return redirect('/')
    else:
        # User did not authenticate. Save their ITSI ID and send to /register
        request.session['itsi_id'] = itsi_user['id']
        return redirect('/register')  # TODO Make this Backbone route


def itsi_register(request):
    itsi_id = request.session['itsi_id']

    # Create new user with given details and no email address or password
    # since they will be authenticated using ITSI credentials
    user = User.objects.create_user(
        request.POST.get('username'),
        email=None,
        password=None,
        first_name=request.POST.get('first_name'),
        last_name=request.POST.get('last_name'),
    )
    user.save()

    # Create corresponding itsi_user object that links to ITSI account
    itsi_user = ItsiUser.objects.create_itsi_user(user, itsi_id)
    itsi_user.save()

    # Authenticate and log new user in
    user = authenticate(itsi_id=itsi_id)
    login(request, user)

    return redirect('/')
