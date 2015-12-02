#!/bin/bash

set -e

API_ENDPOINT="mmw-dev.azavea.com"

printf "\nBegin Analyze 1 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-1.txt --compressed | jsonpp

echo
read -rp "Press [Enter] to continue..."
sleep 10

printf "\nBegin Analyze 60 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-4.txt --compressed | jsonpp

echo
read -rp "Press [Enter] to continue..."
sleep 10

printf "\nBegin Analyze 512 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-7.txt --compressed | jsonpp

echo
read -rp "Press [Enter] to continue..."
sleep 10

printf "\nBegin Analyze 2019 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-9.txt --compressed | jsonpp

echo
read -rp "Press [Enter] to continue..."
sleep 10

printf "\nBegin Analyze 4130 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-9.txt --compressed| jsonpp

echo
read -rp "Press [Enter] to continue..."
sleep 10

printf "\nBegin Analyze 8018 Km\n"
curl -s "https://${API_ENDPOINT}/api/modeling/start/analyze/" --data @analyze-11.txt --compressed | jsonpp
