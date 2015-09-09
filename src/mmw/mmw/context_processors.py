from django.conf import settings


def google_analytics_account(request):
    return {'GOOGLE_ANALYTICS_ACCOUNT': settings.GOOGLE_ANALYTICS_ACCOUNT}
