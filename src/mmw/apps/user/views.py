from django.contrib.auth import authenticate, logout, login as auth_login
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.shortcuts import redirect, render_to_response
from django.contrib.auth.forms import PasswordResetForm

from registration.forms import RegistrationFormUniqueEmail
from registration.backends.default.views import RegistrationView

from rest_framework import decorators, status
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

from apps.user.models import ItsiUser
from apps.user.itsi import ItsiService


@decorators.api_view(['POST', 'GET'])
@decorators.permission_classes((AllowAny, ))
def login(request):
    response_data = {}
    status_code = status.HTTP_200_OK

    if request.method == 'POST':
        user = authenticate(username=request.REQUEST.get('username'),
                            password=request.REQUEST.get('password'))

        if user is not None and user.is_active:
            auth_login(request, user)
            response_data['result'] = 'success'
            response_data['username'] = user.username
            response_data['guest'] = False
        else:
            response_data['result'] = 'error'
            status_code = status.HTTP_400_BAD_REQUEST
    elif request.method == 'GET':
        user = request.user

        if user.is_authenticated() and user.is_active:
            response_data['username'] = user.username
            response_data['guest'] = False
        else:
            response_data['guest'] = True

        response_data['result'] = 'success'
        status_code = status.HTTP_200_OK

    return Response(data=response_data, status=status_code)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def user_logout(request):
    logout(request)

    if request.is_ajax():
        response_data = {'guest': True, 'result': 'success'}
        return Response(data=response_data)
    else:
        return render_to_response('user/logout.html')

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
        return redirect('/error/itsi')

    try:
        session = itsi.get_session_from_code(code)
        itsi_user = session.get_user()
    except:
        # In case we are unable to reach ITSI and get an unexpected response
        return redirect('/error/itsi')

    user = authenticate(itsi_id=itsi_user['id'])
    if user is not None and user.is_active:
        auth_login(request, user)
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
    auth_login(request, user)

    return redirect('/')


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def sign_up(request):
    response_data = {
        'username_valid': True,
        'email_valid': True,
        'password_valid': True,
    }
    status_code = status.HTTP_200_OK
    view = RegistrationView()
    form = RegistrationFormUniqueEmail(request.POST)
    if form.is_valid():
        view.register(request, **form.cleaned_data)
    else:
        if 'username' not in form.cleaned_data:
            response_data['username_valid'] = False
        if 'password1' not in form.cleaned_data or \
           'password2' not in form.cleaned_data or \
           form.cleaned_data['password1'] != form.cleaned_data['password2']:
            response_data['password_valid'] = False
        if 'email' not in form.cleaned_data:
            response_data['email_valid'] = False
        status_code = status.HTTP_400_BAD_REQUEST

    return Response(data=response_data, status=status_code)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def forgot(request):
    response_data = {
        'email_valid': True
    }
    status_code = status.HTTP_200_OK
    form = PasswordResetForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        try:
            # If there are active user(s) that match email
            next(form.get_users(email))
            form.save(request=request)
        except StopIteration:
            response_data['email_valid'] = False
            status_code = status.HTTP_400_BAD_REQUEST
    else:
        response_data['email_valid'] = False
        status_code = status.HTTP_400_BAD_REQUEST

    return Response(data=response_data, status=status_code)
