#!/bin/bash

# Run a celery worker interactively with debug output

set -e

STOP_SERVICE="(sudo service celeryd stop || /bin/true)"
CHANGE_DIR="cd /opt/app/"
RUN_CELERY="envdir /etc/mmw.d/env celery -A 'mmw.celery:app' worker -l debug -n debug@%n"

vagrant ssh worker -c "$STOP_SERVICE && $CHANGE_DIR && $RUN_CELERY"
