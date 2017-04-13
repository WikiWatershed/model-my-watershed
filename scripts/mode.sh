#!/bin/bash

# Switch between MMW and BiG CZ modes

set -e
set -u
set -x

usage() {
    set +x
    echo -n "$(basename "${0}") [OPTION]

Set development mode to MMW or BiG CZ.

Options:
    mmw     Model My Watershed
    bigcz   BiG Critical Zone
"
}


case $1 in
    mmw)
        vagrant ssh app -c 'echo "" | sudo tee /etc/mmw.d/env/MMW_BIGCZ_MODE'
        vagrant ssh app -c 'sudo restart mmw-app'
        ;;
    bigcz)
        vagrant ssh app -c 'echo "1" | sudo tee /etc/mmw.d/env/MMW_BIGCZ_MODE'
        vagrant ssh app -c 'sudo restart mmw-app'
        ;;
    help)
        usage
        exit 0
        ;;
    *)
        usage
        exit 1
        ;;
esac
