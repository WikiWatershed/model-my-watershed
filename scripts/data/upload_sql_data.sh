#!/bin/bash

set -e

usage(){
    echo gzip the provided .sql file, and 
    echo then upload it to the MMW S3 bucket.
    echo
    echo Appends a timestamp to file name before uploading.
    echo
    echo ARGS:
    echo -e "\t [-p MMW_STG_AWS_PROFILE]: Optional, the name of your mmw-stg profile."
    echo -e "\t\t If not provided, will default to AWS_PROFILE environment"
    echo -e "\t\t variable."
    echo -e "\t PATH_TO_FILE: Path to the file to upload"
    echo -e "\t [DST_FILE_NAME]: Optional, if the uploaded file"
    echo -e "\t\t needs a different name than input file"
    echo
    echo "Usage: upload_sql_data.sh [-p MMW_STG_AWS_PROFILE] PATH_TO_FILE [DST_FILE_NAME]"
    exit 1
}

if [[ $# -eq 0 ]] ; then
    usage
fi

# Load optional flagged arguments
while getopts ":p:" opt; do
    case $opt in
        p)
            AWS_PROFILE="$OPTARG" ;;
        \?)
            usage
esac
done 
shift $(( OPTIND-1 ))

# Require AWS_PROFILE to be set
if [ -z ${AWS_PROFILE+x} ]; then
    echo AWS_PROFILE environment variable must be set to your mmw-stg profile
    echo or the mmw-stg profile must be passed in as option -p
    exit;
fi

FILE_PATH=$1
# Require FILE_PATH to be a .sql file
if [[ -z $FILE_PATH || $FILE_PATH != *\.sql ]]; then
    echo You must provide a .sql file
    echo
    usage
fi

echo gzipping...
gzip $FILE_PATH
GZIPPED_FILE_PATH=$FILE_PATH.gz

echo checking integrity of gzip 
GZIP_FAILURE=$(gzip -t $GZIPPED_FILE_PATH)
case "$GZIP_FAILURE" in
    *[!$whitespace]*)
        echo gzip failed: $GZIP_FAILURE
        exit 1
esac

# Get base file name
# eg if FILE_PATH is ./somewhere/nhdflowline.sql
# FILE_PATH will be nhdflowline
FILE_NAME=$(echo $FILE_PATH | \
            sed 's/.*\///' | \
            sed 's/\.sql.*//')

DST_NAME=${2-$FILE_NAME}
DESIRED_FILE_NAME=${DST_NAME}_$(date +%s).sql.gz

echo Creating MD5 checksum
CHECKSUM=$(openssl md5 -binary $GZIPPED_FILE_PATH | base64)

echo Uploading $DESIRED_FILE_NAME to s3
aws s3 cp --profile ${AWS_PROFILE} \
       $GZIPPED_FILE_PATH \
       s3://data.mmw.azavea.com/$DESIRED_FILE_NAME \
       --acl public-read \
       --metadata md5=$CHECKSUM
