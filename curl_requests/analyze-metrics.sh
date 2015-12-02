#!/bin/bash

set -e
set -x

API_ENDPOINT="mmw-dev.azavea.com"

printf "\nBegin Analyze 1 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-1.txt --compressed;
sleep 30;

printf "\nBegin Analyze 16 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-2.txt --compressed;
sleep 30;

printf "\nBegin Analyze 32 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-3.txt --compressed;
sleep 30;

printf "\nBegin Analyze 60 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-4.txt --compressed;
sleep 30;

printf "\nBegin Analyze 121 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-5.txt --compressed;
sleep 30;

printf "\nBegin Analyze 274 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-6.txt --compressed;
sleep 30;

printf "\nBegin Analyze 512 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-7.txt --compressed;
sleep 30;

printf "\nBegin Analyze 1091 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-8.txt --compressed;
sleep 1m;

printf "\nBegin Analyze 2019 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-9.txt --compressed;
sleep 1m;

printf "\nBegin Analyze 4130 Km\n";
curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-10.txt --compressed;
#sleep 2m;

#printf "\nBegin Analyze 8018 Km\n";
#curl "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-11.txt --compressed;
