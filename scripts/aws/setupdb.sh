#!/bin/bash

set -e
set -x

# Export settings required to run psql non-interactively
export PGHOST=$(cat /etc/mmw.d/env/MMW_DB_HOST)
export PGDATABASE=$(cat /etc/mmw.d/env/MMW_DB_NAME)
export PGUSER=$(cat /etc/mmw.d/env/MMW_DB_USER)
export PGPASSWORD=$(cat /etc/mmw.d/env/MMW_DB_PASSWORD)

# Ensure that the PostGIS extension exists
psql -c "CREATE EXTENSION IF NOT EXISTS postgis;"

# Run migrations
envdir /etc/mmw.d/env /opt/app/manage.py migrate
