from django.contrib.auth import (authenticate,
                                 logout as auth_logout,
                                 login as auth_login)
from django.contrib.auth.models import User
from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.contrib.auth.forms import PasswordResetForm
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.sites.shortcuts import get_current_site

from registration.models import RegistrationProfile
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

        if user is not None:
            if user.is_active:
                auth_login(request, user)
                response_data = {
                    'result': 'success',
                    'username': user.username,
                    'itsi': ItsiUser.objects.filter(user_id=user.id).exists(),
                    'guest': False,
                    'id': user.id
                }
            else:
                response_data = {
                    'errors': ['Please activate your account'],
                    'guest': True,
                    'id': 0
                }
                status_code = status.HTTP_400_BAD_REQUEST
        else:
            response_data = {
                'errors': ['Invalid username or password'],
                'guest': True,
                'id': 0
            }
            status_code = status.HTTP_400_BAD_REQUEST

    elif request.method == 'GET':
        user = request.user

        if user.is_authenticated() and user.is_active:
            response_data = {
                'result': 'success',
                'username': user.username,
                'itsi': ItsiUser.objects.filter(user_id=user.id).exists(),
                'guest': False,
                'id': user.id
            }
        else:
            response_data = {
                'result': 'success',
                'guest': True,
                'id': 0
            }

        status_code = status.HTTP_200_OK

    return Response(data=response_data, status=status_code)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def logout(request):
    auth_logout(request)

    if request.is_ajax():
        response_data = {
            'result': 'success',
            'itsi': False,
            'guest': True,
            'id': 0
        }
        return Response(data=response_data)
    else:
        return redirect('/')

itsi = ItsiService()


def itsi_login(request):
    redirect_uri = '{0}?next={1}'.format(
        request.build_absolute_uri(reverse(itsi_auth)),
        request.GET.get('next', '/')
    )
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
        return redirect(request.GET.get('next', '/'))
    else:
        # User did not authenticate. Save their ITSI ID and send to /sign-up
        request.session['itsi_id'] = itsi_user['id']
        return redirect(
            '/sign-up/itsi/{username}.itsi/{first_name}/{last_name}?next={0}'
            .format(
                request.GET.get('next', '/'),
                **itsi_user['extra']
            )
        )


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def itsi_sign_up(request):
    # Validate request
    errors = []
    if 'itsi_id' not in request.session:
        errors.append("There was an error in authenticating you with ITSI")

    if 'username' not in request.POST or not request.POST.get('username'):
        errors.append("Username must be specified")
    elif User.objects.filter(username=request.POST.get('username')).exists():
        errors.append("Username already exists")

    if 'first_name' not in request.POST or not request.POST.get('first_name'):
        errors.append("First name must be specified")
    if 'last_name' not in request.POST or not request.POST.get('last_name'):
        errors.append("Last name must be specified")

    if len(errors) > 0:
        response_data = {"errors": errors}
        return Response(data=response_data,
                        status=status.HTTP_400_BAD_REQUEST)

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

    response_data = {
        'result': 'success',
        'username': user.username,
        'itsi': True,
        'guest': False,
        'id': user.id
    }
    return Response(data=response_data,
                    status=status.HTTP_200_OK)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def sign_up(request):
    view = RegistrationView()
    form = RegistrationFormUniqueEmail(request.POST)

    if form.is_valid():
        user = view.register(request, form)
        response_data = {'result': 'success',
                         'username': user.username,
                         'guest': False}
        return Response(data=response_data,
                        status=status.HTTP_200_OK)
    else:
        errors = []
        if 'username' not in form.cleaned_data:
            errors.append("Username is invalid or already in use")
        if 'password1' not in form.cleaned_data:
            errors.append("Password must be specified")
        if 'password2' not in form.cleaned_data or \
           form.cleaned_data['password1'] != form.cleaned_data['password2']:
            errors.append("Passwords do not match")
        if 'email' not in form.cleaned_data:
            errors.append("Email is invalid or already in use")

        if len(errors) == 0:
            errors.append("Invalid data submitted")

        response_data = {"errors": errors}
        return Response(data=response_data,
                        status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def resend(request):
    # Resend activation email if the key hasn't expired.
    form = PasswordResetForm(request.POST)
    if form.is_valid():
        email = form.cleaned_data['email']
        try:
            registration_profile = RegistrationProfile.objects.get(
                user__email=email)
            if registration_profile.activation_key_expired():
                response_data = {'errors': ["Activation key expired"]}
                status_code = status.HTTP_400_BAD_REQUEST
            else:
                registration_profile.send_activation_email(
                    get_current_site(request))
                response_data = {'result': 'success'}
                status_code = status.HTTP_200_OK
        except ObjectDoesNotExist:
            response_data = {'errors': ["Email cannot be found"]}
            status_code = status.HTTP_400_BAD_REQUEST
    else:
        response_data = {'errors': ["Email is invalid"]}
        status_code = status.HTTP_400_BAD_REQUEST

    return Response(data=response_data, status=status_code)


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def forgot(request):
    form = PasswordResetForm(request.POST)

    if form.is_valid():
        email = form.cleaned_data['email']
        try:
            # If there are active user(s) that match email
            next(form.get_users(email))
            form.save(request=request)
            response_data = {'result': 'success',
                             'guest': True}
            status_code = status.HTTP_200_OK
        except StopIteration:
            response_data = {'errors': ["Email cannot be found"]}
            status_code = status.HTTP_400_BAD_REQUEST
    else:
        response_data = {'errors': ["Email is invalid"]}
        status_code = status.HTTP_400_BAD_REQUEST

    return Response(data=response_data, status=status_code)
