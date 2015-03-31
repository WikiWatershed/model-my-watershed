#!/bin/bash

# Bundle JS and CSS static assets.

set -e

# Defaults
ENTRY_JS_FILES="./js/src/main.js"
STATIC_JS_DIR=/var/www/mmw/static/js
BROWSERIFY=./node_modules/.bin/browserify

usage() {
    echo -n "$(basename $0) [OPTION]...

Bundle JS and CSS static assets.

 Options:
  --watch      Listen for file changes
  --debug      Generate source maps
  -h, --help   Display this help text
"
}

# Read options
while [[ $1 = -?* ]]; do
  case $1 in
    -h|--help) usage; exit 1 ;;
    --watch) ENABLE_WATCH=1 ;;
    --debug) ENABLE_DEBUG=1 ;;
  esac
  shift
done

if [ -n "$ENABLE_DEBUG" ]; then
    BROWSERIFY="$BROWSERIFY --debug"
fi

if [ -n "$ENABLE_WATCH" ]; then
    BROWSERIFY=./node_modules/.bin/watchify
    # These flags have to appear at the end or watchify will exit.
    EXTRA_ARGS="--verbose --poll"
fi

VAGRANT_COMMAND="cd /opt/app && \
    mkdir -p $STATIC_JS_DIR && \
    $BROWSERIFY $ENTRY_JS_FILES -o '$STATIC_JS_DIR/main.js' $EXTRA_ARGS"

echo "$VAGRANT_COMMAND"
vagrant ssh app -c "$VAGRANT_COMMAND"
