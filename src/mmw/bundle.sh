#!/bin/bash

set -e

if [ -z "$DJANGO_STATIC_ROOT" ]; then
    echo "Environment variable not defined DJANGO_STATIC_ROOT"
    exit 1
fi

# Default settings
STATIC_JS_DIR="${DJANGO_STATIC_ROOT}js/"
STATIC_CSS_DIR="${DJANGO_STATIC_ROOT}css/"
STATIC_IMAGES_DIR="${DJANGO_STATIC_ROOT}images/"
STATIC_FONTS_DIR="${DJANGO_STATIC_ROOT}fonts/"

BROWSERIFY=./node_modules/.bin/browserify
ENTRY_JS_FILES="./js/src/main.js"

JSTIFY_TRANSFORM="-t [ jstify --noMinify ]"

NODE_SASS=./node_modules/.bin/node-sass
ENTRY_SASS_DIR=./sass/
ENTRY_SASS_FILE="${ENTRY_SASS_DIR}main.scss"
VENDOR_CSS_FILE="${STATIC_CSS_DIR}vendor.css"


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

ENSURE_DIRS_EXIST="mkdir -p \
    $STATIC_JS_DIR \
    $STATIC_CSS_DIR \
    $STATIC_IMAGES_DIR \
    $STATIC_FONTS_DIR"

COPY_IMAGES_COMMAND="cp -r \
    ./node_modules/leaflet/dist/images/* \
    $STATIC_IMAGES_DIR"

COPY_FONTS_COMMAND="cp -r \
    ./node_modules/font-awesome/fonts/* \
    $STATIC_FONTS_DIR"

CONCAT_VENDOR_CSS_COMMAND="cat \
    ./node_modules/leaflet/dist/leaflet.css \
    ./node_modules/font-awesome/css/font-awesome.min.css \
    > $VENDOR_CSS_FILE"

VAGRANT_COMMAND="cd /opt/app && \
    $ENSURE_DIRS_EXIST && { \
    $COPY_IMAGES_COMMAND &
    $COPY_FONTS_COMMAND &
    $CONCAT_VENDOR_CSS_COMMAND &
    $NODE_SASS $ENTRY_SASS_FILE -o ${STATIC_CSS_DIR} & \
    $BROWSERIFY $ENTRY_JS_FILES $JSTIFY_TRANSFORM \
        -o ${STATIC_JS_DIR}main.js $EXTRA_ARGS; }"

echo "$VAGRANT_COMMAND"
eval "$VAGRANT_COMMAND"
