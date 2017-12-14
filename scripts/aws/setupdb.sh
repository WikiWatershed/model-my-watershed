#!/bin/bash

set -e
set -x

usage="$(basename "$0") [-h] [-b] [-s] \n
--Sets up a postgresql database for MMW \n
\n
where: \n
    -h  show this help text\n
    -b  load/reload boundary data\n
    -f  load a named boundary sql.gz\n
    -s  load/reload stream data\n
    -d  load/reload DRB stream data\n
    -m  load/reload mapshed data\n
    -p  load/reload DEP data\n
    -c  load/reload nhdplus catchment data
    -q  load/reload water quality data\n
    -x  purge s3 cache for given path\n
"

# HTTP accessible storage for initial app data
FILE_HOST="https://s3.amazonaws.com/data.mmw.azavea.com"
load_boundary=false
file_to_load=
load_stream=false
load_mapshed=false
load_water_quality=false
load_catchment=false

while getopts ":hbsdpmqcf:x:" opt; do
    case $opt in
        h)
            echo -e $usage
            exit ;;
        b)
            load_boundary=true ;;
        s)
            load_stream=true ;;
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

# Run migrations
envdir /etc/mmw.d/env /opt/app/manage.py migrate

function download_and_load {
    for f in "${FILES[@]}"; do
        curl -s $FILE_HOST/$f | gunzip -q | psql --single-transaction
    done
}

function purge_tile_cache {
    for path in "${PATHS[@]}"; do
        aws s3 rm --recursive "s3://tile-cache.${PUBLIC_HOSTED_ZONE_NAME}/${path}/"
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
    FILES=("boundary_county.sql.gz" "boundary_school_district.sql.gz" "boundary_district.sql.gz" "boundary_huc12_deduped.sql.gz" "boundary_huc10.sql.gz" "boundary_huc08.sql.gz")
    PATHS=("county" "district" "huc8" "huc10" "huc12" "school")

    download_and_load $FILES
    purge_tile_cache $PATHS
fi

if [ "$load_stream" = "true" ] ; then
    # Fetch stream network layer sql files
    FILES=("nhdflowline_with_slope.sql.gz")
    PATHS=("nhd_streams_v2")

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
    FILES=("ms_weather.sql.gz" "ms_weather_station.sql.gz" "ms_pointsource.sql.gz"
           "ms_pointsource_drb.sql.gz" "ms_county_animals.sql.gz")

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
