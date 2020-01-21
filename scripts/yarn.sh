#!/bin/bash

# Pass arguments to yarn the project root

set -e
set -x

ARGS=$*

vagrant ssh app -c "cd /opt/app && envdir /etc/mmw.d/env yarn $ARGS"
