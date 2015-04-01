#!/bin/bash

set -e

if [ -z "$DJANGO_STATIC_ROOT" ]; then
    echo "Environment variable not defined DJANGO_STATIC_ROOT"
    exit 1
fi

# Defaults
ENTRY_JS_FILES="./js/src/main.js"
STATIC_JS_DIR="$DJANGO_STATIC_ROOT/js"
BROWSERIFY=./node_modules/.bin/browserify

ENTRY_CSS_FILE=./sass/main.scss
STATIC_CSS_DIR="$DJANGO_STATIC_ROOT/css"
NODESASS=./node_modules/.bin/node-sass

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

if [ -n "$ENABLE_WATCH" ]; then
    BROWSERIFY=./node_modules/.bin/watchify
    # These flags have to appear at the end or watchify will exit.
    EXTRA_ARGS="--verbose --poll"
    NODESASS="$NODESASS --watch --recursive"
fi

if [ -n "$ENABLE_DEBUG" ]; then
    BROWSERIFY="$BROWSERIFY --debug"
    NODESASS="$NODESASS --source-map $STATIC_CSS_DIR/main.css.map --source-map-contents"
fi

VAGRANT_COMMAND="cd /opt/app && \
    mkdir -p $STATIC_JS_DIR $STATIC_CSS_DIR && { \
    $NODESASS $ENTRY_CSS_FILE -o $STATIC_CSS_DIR & \
    $BROWSERIFY $ENTRY_JS_FILES -o $STATIC_JS_DIR/main.js $EXTRA_ARGS; }"

echo "$VAGRANT_COMMAND"
eval "$VAGRANT_COMMAND"
