from rest_framework import status
from rest_framework.exceptions import APIException


class JobNotReadyError(APIException):
    status_code = status.HTTP_428_PRECONDITION_REQUIRED
    default_code = 'precondition_required'
    default_detail = 'The prepare job has not finished yet.'


class JobFailedError(APIException):
    status_code = status.HTTP_412_PRECONDITION_FAILED
    default_code = 'precondition_failed'
    default_detail = 'The prepare job has failed.'
