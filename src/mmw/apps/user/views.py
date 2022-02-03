import rollbar

from copy import deepcopy
from uuid import uuid1

from django.contrib.auth import (authenticate,
                                 update_session_auth_hash,
                                 logout as auth_logout,
                                 login as auth_login)
from django.contrib.auth.models import User
from django.urls import reverse
from django.shortcuts import redirect, render
from django.contrib.auth.forms import (PasswordResetForm,
                                       PasswordChangeForm)
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.sites.shortcuts import get_current_site
from django.conf import settings
from django.db import transaction

from registration.models import RegistrationProfile
from registration.forms import RegistrationFormUniqueEmail
from registration.backends.default.views import RegistrationView

from rest_framework import decorators, status
from rest_framework.response import Response
from rest_framework.permissions import (AllowAny,
                                        IsAuthenticated)

from apps.export.hydroshare import HydroShareService
from apps.export.models import HydroShareResource
from apps.home.views import get_context
from apps.user.models import (ConcordUser,
                              ItsiUser,
                              UserProfile,
                              HydroShareToken)
from apps.user.sso import ItsiService, ConcordService
from apps.user.serializers import UserProfileSerializer

EMBED_FLAG = settings.ITSI['embed_flag']


@decorators.api_view(['POST', 'GET'])
@decorators.permission_classes((AllowAny, ))
def login(request):
    response_data = {}
    status_code = status.HTTP_200_OK

    def make_successful_response_data(user):
        profile, created = UserProfile.objects.get_or_create(user=user)
        return {
            'result': 'success',
            'username': user.username,
            'itsi': ItsiUser.objects.filter(user_id=user.id).exists(),
            'hydroshare': HydroShareToken.objects
                                         .filter(user_id=user.id).exists(),
            'guest': False,
            'id': user.id,
            'has_seen_hotspot_info': profile.has_seen_hotspot_info,
            'profile_was_skipped': profile.was_skipped,
            'profile_is_complete': profile.is_complete,
            'profile': {
                'first_name': user.first_name,
                'last_name': user.last_name,
                'organization': profile.organization,
                'country': profile.country,
                'user_type': profile.user_type,
                'postal_code': profile.postal_code,
                'unit_scheme': profile.unit_scheme,
            }
        }

    if request.method == 'POST':
        user = authenticate(username=request.POST.get('username'),
                            password=request.POST.get('password'))

        if user is not None:
            if user.is_active:
                auth_login(request, user)
                response_data = make_successful_response_data(user)
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
        if user.is_authenticated and user.is_active:
            response_data = make_successful_response_data(user)
        else:
            response_data = {
                'result': 'success',
                'guest': True,
                'id': 0
            }

        status_code = status.HTTP_200_OK

    return Response(data=response_data, status=status_code)


@decorators.api_view(['POST'])
@decorators.permission_classes((IsAuthenticated, ))
def profile(request):
    data = deepcopy(request.data)
    if 'was_skipped' in data:
        data['was_skipped'] = str(data['was_skipped']).lower() == 'true'
        data['is_complete'] = not data['was_skipped']
    else:
        data['is_complete'] = True

    data['user_id'] = request.user.pk

    serializer = UserProfileSerializer(data=data,
                                       context={"request": request})
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@decorators.api_view(['GET'])
@decorators.permission_classes((AllowAny, ))
def logout(request):
    auth_logout(request)

    if request.META.get('HTTP_X_REQUESTED_WITH') == 'XMLHttpRequest':
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
        request.build_absolute_uri(reverse('user:itsi_auth')),
        request.GET.get('next', '/')
    )
    params = {'redirect_uri': redirect_uri}
    auth_url = itsi.get_authorize_url(**params)

    return redirect(auth_url)


def itsi_auth(request):
    code = request.GET.get('code', None)

    # Basic validation
    if code is None:
        return redirect('/error/sso')

    try:
        session = itsi.get_session_from_code(code)
        itsi_user = session.get_user()
    except Exception as e:
        # In case we are unable to reach ITSI and get an unexpected response
        rollbar.report_message(f'ITSI OAuth Error: {e.message}', 'error')
        return redirect('/error/sso')

    user = authenticate(sso_id=itsi_user['id'])
    if user is not None and user.is_active:
        auth_login(request, user)
        return redirect(request.GET.get('next', '/'))
    else:
        return itsi_create_user(request, itsi_user)


def itsi_create_user(request, itsi_user):
    itsi_id = itsi_user['id']
    itsi_username = itsi_user['extra']['username']
    # Truncate names to 30 characters max
    first_name = itsi_user['extra']['first_name'][:29]
    last_name = itsi_user['extra']['last_name'][:29]

    # If username already exists, append a number to it, and keep it below
    # 31 characters
    suffix = 0
    midfix = '.itsi'
    username = trim_to_valid_length(itsi_username, midfix)
    while User.objects.filter(username=username).exists():
        username = trim_to_valid_length(itsi_username,  midfix + str(suffix))
        suffix += 1

    # Create new user with given details and no email address or password
    # since they will be authenticated using ITSI credentials
    user = User.objects.create_user(
        username,
        email=None,
        password=None,
        first_name=first_name,
        last_name=last_name,
    )
    user.save()

    # Create corresponding itsi_user object that links to ITSI account
    itsi_user = ItsiUser.objects.create_itsi_user(user, itsi_id)
    itsi_user.save()

    # Save embed mode state since we're going to lose the session upon
    # logging in as a new user
    itsi_embed = request.session.get(EMBED_FLAG, False)

    # Authenticate and log new user in
    user = authenticate(sso_id=itsi_id)
    auth_login(request, user)

    # Re-set itsi_embed flag
    request.session[EMBED_FLAG] = itsi_embed

    return redirect(
        '/sign-up/sso/ITSI/{0}/{1}/{2}?next={3}'
        .format(
            itsi_username,
            first_name,
            last_name,
            request.GET.get('next', '/')
        )
    )


def trim_to_valid_length(basename, suffix):
    """Django auth model prevents usernames from being greater
       than 30 chars. Take a chunk out of long names and make an
       attempt at having the new name be unique
    """

    max_len = 30
    unique_len = 7
    username = basename + suffix

    if len(username) > max_len:
        unique = uuid1().hex[:unique_len]

        # Strip out characters so that name + unique + suffix is <= max_len
        diff = (len(username) - max_len) + unique_len
        username = basename[:-diff] + unique + suffix

    return username


concord = ConcordService()


def concord_login(request):
    redirect_uri = request.build_absolute_uri(reverse('user:concord_auth'))
    params = {
        'redirect_uri': redirect_uri,
        'state': request.GET.get('next', '/'),
        'response_type': 'code',
    }
    auth_url = concord.get_authorize_url(**params)

    return redirect(auth_url)


def concord_auth(request):
    code = request.GET.get('code', None)

    # Basic validation
    if code is None:
        return redirect('/error/sso')

    try:
        session = concord.get_session_from_code(code)
        concord_user = session.get_user()
    except Exception as e:
        # Report OAuth error
        rollbar.report_message(f'Concord OAuth Error: {e.message}', 'error')
        return redirect('/error/sso')

    user = authenticate(sso_id=concord_user['id'])
    if user is not None and user.is_active:
        auth_login(request, user)
        return redirect(request.GET.get('state', '/'))
    else:
        return concord_create_user(request, concord_user)


def concord_create_user(request, concord_user):
    """In high correspondence itsi_create_user"""
    concord_id = concord_user['id']
    concord_username = concord_user['extra']['username']
    # Truncate names to 30 characters max
    first_name = concord_user['extra']['first_name'][:29]
    last_name = concord_user['extra']['last_name'][:29]

    # If username already exists, append a number to it, and keep it below
    # 31 characters
    suffix = 0
    midfix = '.concord'
    username = trim_to_valid_length(concord_username, midfix)
    while User.objects.filter(username=username).exists():
        username = trim_to_valid_length(concord_username, midfix + str(suffix))
        suffix += 1

    # Create new user with given details and no email address or password
    # since they will be authenticated using Concord credentials
    user = User.objects.create_user(
        username,
        email=None,
        password=None,
        first_name=first_name,
        last_name=last_name,
    )
    user.save()

    # Create corresponding concord_user object that links to Concord account
    concord_user = ConcordUser.objects.create(user=user, concord_id=concord_id)
    concord_user.save()

    # Authenticate and log new user in
    user = authenticate(sso_id=concord_id)
    auth_login(request, user)

    return redirect(
        '/sign-up/sso/Learn Portal/{0}/{1}/{2}?next={3}'
        .format(
            concord_username,
            first_name,
            last_name,
            request.GET.get('state', '/')
        )
    )


@decorators.api_view(['POST'])
@decorators.permission_classes((AllowAny, ))
def sign_up(request):
    view = RegistrationView(request=request)
    form = RegistrationFormUniqueEmail(request.POST)

    if form.is_valid():
        user = view.register(form)
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


@decorators.api_view(['POST'])
@decorators.permission_classes((IsAuthenticated, ))
def change_password(request):
    form = PasswordChangeForm(user=request.user, data=request.POST)
    if form.is_valid():
        form.save()
        update_session_auth_hash(request, form.user)
        response_data = {'result': 'success'}
        status_code = status.HTTP_200_OK
    else:
        response_data = {'errors': form.errors.values()}
        status_code = status.HTTP_400_BAD_REQUEST

    return Response(data=response_data, status=status_code)


hss = HydroShareService()


@decorators.permission_classes((IsAuthenticated, ))
def hydroshare_login(request):
    redirect_uri = request.build_absolute_uri(reverse('user:hydroshare_auth'))
    params = {'redirect_uri': redirect_uri, 'response_type': 'code'}
    auth_url = hss.get_authorize_url(**params)
    return redirect(auth_url)


@decorators.permission_classes((IsAuthenticated, ))
def hydroshare_auth(request):
    context = get_context(request)
    context.update({
        'error': None,
        'token': None,
    })

    code = request.GET.get('code')

    if code is None:
        error = request.GET.get('error')
        context.update({'error': error})
    else:
        reverse_uri = reverse('user:hydroshare_auth')
        redirect_uri = request.build_absolute_uri(reverse_uri)
        try:
            token = hss.set_token_from_code(code, redirect_uri, request.user)
            context.update({'token': token.access_token})
        except (IOError, RuntimeError) as e:
            context.update({'error': e.message})

    if context.get('error') == 'invalid_client':
        rollbar.report_message('HydroShare OAuth credentials '
                               'possibly misconfigured', 'warning')

    return render(request, 'user/hydroshare-auth.html', context)


@decorators.api_view(['POST'])
@decorators.permission_classes((IsAuthenticated, ))
@transaction.atomic
def hydroshare_logout(request):
    try:
        token = HydroShareToken.objects.get(user=request.user)
    except ObjectDoesNotExist:
        token = None

    if token:
        # Disconnect all of this user's projects from HydroShare
        HydroShareResource.objects.filter(project__user=request.user).delete()

        # Delete token
        token.delete()

    return Response(status=status.HTTP_204_NO_CONTENT)
