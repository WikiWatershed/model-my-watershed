#!/bin/bash

set -e
set -x

vagrant ssh app -c "cd /var/www/mmw/static &&
    /opt/app/node_modules/.bin/testem -f /opt/app/testem.json $*"
