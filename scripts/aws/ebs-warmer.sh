#!/bin/bash

# Ref: http://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ebs-initialize.html

function log() {
    echo "[$(date --rfc-3339=seconds)] $1"
}

log "Warming up RWD EBS volume..."

find /opt/rwd-data/nhd/Main_Watershed/* -type f -print0 \
    | xargs -0 -P0 -L1 -t cat >/dev/null

find /opt/rwd-data/drb/Main_Watershed/* -type f -print0 \
    | xargs -0 -P0 -L1 -t cat >/dev/null

log "Done"
