#!/bin/bash

set -e
set -u
set -x

usage() {
    set +x
    echo -n "$(basename "${0}") [OPTION]

    Toggle what feature flags are on

    Options:
    subbasin     Sub-basin modeling
    clear        Clear any features that might be on
    "
}

featureEnabled() {
    return $(vagrant ssh app -c "cat /etc/mmw.d/env/MMW_ENABLED_FEATURES" | grep -q $1)
}

enableFeature() {
    if ! featureEnabled $1
    then
        vagrant ssh app -c \
            "sudo bash -c 'echo -n \"$1 \" >> /etc/mmw.d/env/MMW_ENABLED_FEATURES'"
        RESTART_APP=1
    fi
}

RESTART_APP=0
for n; do
    case $n in
        # Replace 'example' with the feature you to be togglable
        example)
            enableFeature example
            shift
            ;;
        clear)
            vagrant ssh app -c "sudo bash -c 'echo -n '' > /etc/mmw.d/env/MMW_ENABLED_FEATURES'"
            RESTART_APP=1
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
done

if [[ $RESTART_APP -eq 1 ]]
then
    vagrant ssh app -c 'sudo restart mmw-app'
fi
