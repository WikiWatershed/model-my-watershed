#!/bin/bash

set -e

if [ -z "$DJANGO_STATIC_ROOT" ]; then
    echo "Environment variable not defined DJANGO_STATIC_ROOT"
    exit 1
fi

# Default settings
ENTRY_JS_FILES="./js/src/main.js"
STATIC_JS_DIR="${DJANGO_STATIC_ROOT}js/"
BROWSERIFY=./node_modules/.bin/browserify

ENTRY_SASS_DIR=./sass/
ENTRY_SASS_FILE=./sass/main.scss
STATIC_CSS_DIR="${DJANGO_STATIC_ROOT}css/"
NODE_SASS=./node_modules/.bin/node-sass

usage() {
    echo -n "$(basename $0) [OPTION]...

Bundle JS and CSS static assets.

 Options:
  --watch      Listen for file changes
  --debug      Generate source maps
  -h, --help   Display this help text
"
}

# Handle options
while [[ -n $1 ]]; do
    case $1 in
        --watch) ENABLE_WATCH=1 ;;
        --debug) ENABLE_DEBUG=1 ;;
        -h|--help|*) usage; exit 1 ;;
    esac
    shift
done

if [ -n "$ENABLE_WATCH" ]; then
    BROWSERIFY=./node_modules/.bin/watchify
    # These flags have to appear last or watchify will exit immediately.
    EXTRA_ARGS="--verbose --poll"
    NODE_SASS="$NODE_SASS --watch --recursive"
    # This argument must be a folder in watch mode, but a
    # single file otherwise.
    ENTRY_SASS_FILE="$ENTRY_SASS_DIR"
fi

if [ -n "$ENABLE_DEBUG" ]; then
    BROWSERIFY="$BROWSERIFY --debug"
    NODE_SASS="$NODE_SASS --source-map ${STATIC_CSS_DIR}main.css.map \
        --source-map-contents"
fi

VAGRANT_COMMAND="cd /opt/app && \
    mkdir -p $STATIC_JS_DIR $STATIC_CSS_DIR && { \
    $NODE_SASS $ENTRY_SASS_FILE -o ${STATIC_CSS_DIR} & \
    $BROWSERIFY $ENTRY_JS_FILES -o ${STATIC_JS_DIR}main.js $EXTRA_ARGS; }"

echo "$VAGRANT_COMMAND"
eval "$VAGRANT_COMMAND"
