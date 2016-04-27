#!/bin/bash

# Run a gunicorn webserver with expanded logging and auto-restart

set -e
set -x

vagrant ssh app -c "sudo service mmw-app stop || /bin/true"
vagrant ssh app -c "cd /opt/app/ && envdir /etc/mmw.d/env gunicorn --config /etc/mmw.d/gunicorn.py mmw.wsgi"
vagrant ssh app -c "sudo start mmw-app"
