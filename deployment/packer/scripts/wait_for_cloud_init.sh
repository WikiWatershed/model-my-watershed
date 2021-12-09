#!/bin/bash

TIMEOUT=60

echo 'Waiting for cloud-init...'

ELAPSED_SECONDS=0

until test -e /var/lib/cloud/instance/boot-finished || [ $ELAPSED_SECONDS -eq $TIMEOUT ]; do 
    sleep 1
    ((ELAPSED_SECONDS++))
done

exit 0
