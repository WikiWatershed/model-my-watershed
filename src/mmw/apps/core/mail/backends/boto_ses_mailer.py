# -*- coding: utf-8 -*-
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import json
import logging
import sys
import traceback
import boto.ses

from django.conf import settings
from django.core.mail.backends.base import BaseEmailBackend
from django.core.exceptions import ImproperlyConfigured

from django_statsd.clients import statsd
from email.mime.text import MIMEText
from boto.utils import get_instance_metadata

logger = logging.getLogger(__name__)


class EmailBackend(BaseEmailBackend):

    def __init__(self, fail_silently=False, aws_region=None, *args,
                 **kwargs):
        super(EmailBackend, self).__init__(fail_silently=fail_silently)
        self.mailer = BotoMailer(aws_region)
        self.check_quota = getattr(settings, 'EMAIL_BOTO_CHECK_QUOTA', False)

    def send_messages(self, email_messages):
        if not email_messages:
            return
        sent_message_count = 0

        if self.check_quota:
            remaining_quota = self.mailer.get_remaining_message_quota()
            self._log_quota(remaining_quota)
        else:
            remaining_quota = sys.maxint

        if len(email_messages) <= remaining_quota:
            for email_message in email_messages:
                if self._send_message(email_message):
                    sent_message_count += 1
            return sent_message_count
        else:
            raise SESQuotaException("Attempted to send %d messages with only "
                                    "%d remaining. Wait before retrying" %
                                    (len(email_messages), remaining_quota),
                                    email_messages)

    def _send_message(self, email_message):
        message = email_message.message()
        try:
            response = self.mailer.send_message_bytes(
                message.as_bytes(linesep='\r\n'),
                email_message.from_email,
                email_message.to)
            self._log_message(email_message, response)
            return response
        except Exception:
            self._log_message_failure(email_message,
                                      traceback.format_exc())
            if not self.fail_silently:
                raise

    def _log_message(self, email_message, response):
        statsd.incr('email.message.success')
        logger.debug('Sent email with subject "%s" to %s: %s' % (
            email_message.subject, email_message.to, json.dumps(response)))

    def _log_message_failure(self, email_message, trace):
        statsd.incr('email.message.failure')
        logger.error('Exception raised while sending email '
                     'with subject "%s" to %s: %s' % (
                         email_message.subject, email_message.to, trace))

    def _log_quota(self, quota):
        statsd.gauge('email.quota', quota)


class SESQuotaException(Exception):
    def __init__(self, message, email_messages):
        super(Exception, self).__init__(message)
        self.email_messages = email_messages


class BotoMailer():

    def __init__(self, aws_region):
        if not aws_region:
            instance_metadata = get_instance_metadata(timeout=5)
            if not instance_metadata:
                raise ImproperlyConfigured('Failed to get instance metadata')
            aws_region = instance_metadata['placement']['availability-zone']
            # The AWS Region will return as `us-east-1a` but we want
            # `us-east-1` so we trim the trailing character.
            aws_region = aws_region[:-1]

        self.aws_region = aws_region

    def send_plain_text_message(self, text, subject, from_email, to):
        message = MIMEText(text)
        message['Subject'] = subject
        message['From'] = from_email
        message['To'] = to
        self.send_message_bytes(message.as_string(), from_email, to)

    def send_message_bytes(self, message_bytes, from_email, to):
        return self._connection().send_raw_email(message_bytes, from_email, to)

    def get_remaining_message_quota(self):
        response = self._connection().get_send_quota()
        quota = response['GetSendQuotaResponse']['GetSendQuotaResult']
        limit = int(float(quota['Max24HourSend']))
        sent_count = int(float(quota['SentLast24Hours']))
        return limit - sent_count

    def _connection(self):
        return boto.ses.connect_to_region(self.aws_region)
