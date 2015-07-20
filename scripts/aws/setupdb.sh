#!/bin/bash

set -e
set -x

usage="$(basename "$0") [-h] [-d] \n
--Sets up a postgresql database for MMW \n
\n
where: \n
    -h  show this help text\n
    -d  load/reload base data\n
"

load_data=false

while getopts ":hd" opt; do
    case $opt in
        h)
            echo -e $usage
            exit
            ;;
        d)
            load_data=true
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

if [ "$load_data" = "true" ] ; then
	# Fetch boundary layer sql files
	FILE_HOST="https://s3.amazonaws.com/data.mmw.azavea.com"
	FILES=("boundary_huc12.sql.gz" "boundary_huc10.sql.gz" "boundary_huc08.sql.gz")

	for f in "${FILES[@]}"; do
	    curl -s $FILE_HOST/$f | gunzip -q | psql --single-transaction
	done
fi
