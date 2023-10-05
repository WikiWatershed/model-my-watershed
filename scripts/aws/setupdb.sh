#!/bin/bash

set -e
set -x

usage="$(basename "$0") [-h] [options] \n
--Sets up a postgresql database for MMW \n
\n
where options are one or more of: \n
    -h  show this help text\n
    -b  load/reload boundary data\n
    -f  load a named boundary sql.gz\n
    -s  load/reload stream data\n
    -S  load/reload Hi Res stream data (very large)\n
    -d  load/reload DRB stream data\n
    -m  load/reload mapshed data\n
    -p  load/reload DEP data\n
    -c  load/reload nhdplus catchment data\n
    -q  load/reload water quality data\n
    -X  purge s3 cache as well\n
    -x  purge s3 cache for given path\n
"

# HTTP accessible storage for initial app data
FILE_HOST="https://s3.amazonaws.com/data.mmw.azavea.com"
load_boundary=false
file_to_load=
load_stream=false
load_hires_stream=false
load_mapshed=false
load_water_quality=false
load_catchment=false
should_purge_cache=false

while getopts ":hbsSdpmqcf:x:" opt; do
    case $opt in
        h)
            echo -e $usage
            exit ;;
        b)
            load_boundary=true ;;
        s)
            load_stream=true ;;
        S)
            load_hires_stream=true ;;
        d)
            load_drb_streams=true ;;
        p)
            load_dep=true ;;
        m)
            load_mapshed=true ;;
        q)
            load_water_quality=true ;;
        c)
            load_catchment=true ;;
        f)
            file_to_load=$OPTARG ;;
        x)
            path_to_purge=$OPTARG ;;
        X)
            should_purge_cache=true ;;
        \?)
            echo "invalid option: -$OPTARG"
            exit ;;
    esac
done

# Export settings required to run psql non-interactively
export PGHOST=$(cat /etc/mmw.d/env/MMW_DB_HOST)
export PGDATABASE=$(cat /etc/mmw.d/env/MMW_DB_NAME)
export PGUSER=$(cat /etc/mmw.d/env/MMW_DB_USER)
export PGPASSWORD=$(cat /etc/mmw.d/env/MMW_DB_PASSWORD)
export PUBLIC_HOSTED_ZONE_NAME=$(cat /etc/mmw.d/env/MMW_PUBLIC_HOSTED_ZONE_NAME)

# Ensure that the PostGIS extension exists
psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"
psql -c "ALTER TABLE spatial_ref_sys OWNER TO ${PGUSER};"

# Create pg_trgm extension for faster LIKE matches
psql -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"

# Run migrations
envdir /etc/mmw.d/env /opt/app/manage.py migrate

function download_and_load {
    for f in "${FILES[@]}"; do
        curl -s $FILE_HOST/$f | gunzip -q | psql --single-transaction
    done
}

function purge_tile_cache {
    if [ "$should_purge_cache" = "true" ] ; then
        for path in "${PATHS[@]}"; do
            aws s3 rm --recursive "s3://tile-cache.${PUBLIC_HOSTED_ZONE_NAME}/${path}/"
        done
    fi
}

function create_trgm_indexes {
    # Creates a trgm index on the 'name' column for each table.
    for table in "${TRGM_TABLES[@]}"; do
        psql -c "CREATE INDEX IF NOT EXISTS trgm_idx_${table}_name ON ${table}"`
                `" USING gin (name gin_trgm_ops);"
    done
}

if [ ! -z "$file_to_load" ] ; then
    FILES=("$file_to_load")
    download_and_load $FILES
fi

if [ ! -z "$path_to_purge" ] ; then
    PATHS=("$path_to_purge")
    purge_tile_cache $PATHS
fi

if [ "$load_dep" = "true" ] ; then
    # Fetch DEP layers
    FILES=("dep_urban_areas.sql.gz" "dep_municipalities.sql.gz")
    PATHS=("urban_areas" "municipalities")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi


if [ "$load_boundary" = "true" ] ; then
    # Fetch boundary layer sql files
    FILES=("boundary_county_20210910.sql.gz" "boundary_school_district.sql.gz" "boundary_district.sql.gz" "boundary_huc12_deduped.sql.gz" "boundary_huc10.sql.gz" "boundary_huc08.sql.gz")
    PATHS=("county" "district" "huc8" "huc10" "huc12" "school")
    TRGM_TABLES=("boundary_huc08" "boundary_huc10" "boundary_huc12")

    download_and_load $FILES
    create_trgm_indexes $TRGM_TABLES
    purge_tile_cache $PATHS
fi

if [ "$load_stream" = "true" ] ; then
    # Fetch stream network layer sql files
    FILES=("nhdflowline_1513899196.sql.gz")
    PATHS=("nhd_streams_v2")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi

if [ "$load_hires_stream" = "true" ] ; then
    # Fetch hires stream network layer sql files
    FILES=("nhdflowlinehr.sql.gz")
    PATHS=("nhd_streams_hr_v1")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi


if [ "$load_drb_streams" = "true" ] ; then
    # Fetch DRB stream network layer sql file
    FILES=("drb_streams_50.sql.gz")
    PATHS=("drb_streams_v2")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi

if [ "$load_mapshed" = "true" ] ; then
    # Fetch map shed specific vector features
    FILES=("ms_weather.sql.gz" "ms_weather_station_1523624744.sql.gz"
           "ms_pointsource.sql.gz" "ms_pointsource_drb_20220413.sql.gz"
           "ms_county_animals.sql.gz")

    download_and_load $FILES
fi

if [ "$load_catchment" = "true" ] ; then
    # Fetch NHDPlus Catchments
    FILES=("nhdpluscatchment.sql.gz")
    download_and_load $FILES
fi

if [ "$load_water_quality" = "true" ] ; then
    # Fetch water quality data
    FILES=("nhd_water_quality.sql.gz" "drb_catchment_water_quality.sql.gz")
    PATHS=("drb_catchment_water_quality_tn" "drb_catchment_water_quality_tp"
            "drb_catchment_water_quality_tss" "nhd_quality_tp" "nhd_quality_tn")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi
