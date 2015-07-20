#!/bin/bash

set -e
set -x

usage="$(basename "$0") [-h] [-b] [-s] \n
--Sets up a postgresql database for MMW \n
\n
where: \n
    -h  show this help text\n
    -b  load/reload boundary data\n
    -s  load/reload stream data\n
"

# HTTP accessible storage for initial app data
FILE_HOST="https://s3.amazonaws.com/data.mmw.azavea.com"
load_boundary=false
load_stream=false

while getopts ":hbs" opt; do
    case $opt in
        h)
            echo -e $usage
            exit
            ;;
        b)
            load_boundary=true
            ;;
        s)
            load_stream=true
            ;;
        \?)
            echo "invalid option: -$OPTARG"
            exit
            ;;
    esac
done
# Export settings required to run psql non-interactively
export PGHOST=$(cat /etc/mmw.d/env/MMW_DB_HOST)
export PGDATABASE=$(cat /etc/mmw.d/env/MMW_DB_NAME)
export PGUSER=$(cat /etc/mmw.d/env/MMW_DB_USER)
export PGPASSWORD=$(cat /etc/mmw.d/env/MMW_DB_PASSWORD)

# Ensure that the PostGIS extension exists
psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
envdir /etc/mmw.d/env /opt/app/manage.py migrate

function download_and_load {
    for f in "${FILES[@]}"; do
        curl -s $FILE_HOST/$f | gunzip -q | psql --single-transaction
    done
}

if [ "$load_boundary" = "true" ] ; then
    # Fetch boundary layer sql files
    FILES=("boundary_district.sql.gz" "boundary_huc12.sql.gz" "boundary_huc10.sql.gz" "boundary_huc08.sql.gz")

    download_and_load $FILES
fi

if [ "$load_stream" = "true" ] ; then
    # Fetch stream network layer sql files
    FILES=("drb_stream_network_20.sql.gz" "drb_stream_network_50.sql.gz" "drb_stream_network_100.sql.gz")

    download_and_load $FILES
fi
