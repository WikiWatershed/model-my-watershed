!#/bin/bash

printf "\nBegin TR55 1 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-1.txt --compressed;
sleep 30;

printf "\nBegin TR55 16 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-2.txt --compressed;
sleep 30;

printf "\nBegin TR55 32 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-3.txt --compressed;
sleep 30;

printf "\nBegin TR55 60 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-4.txt --compressed;
sleep 30;

printf "\nBegin TR55 121 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-5.txt --compressed;
sleep 30;

printf "\nBegin TR55 274 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-6.txt --compressed;
sleep 30;

printf "\nBegin TR55 512 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-7.txt --compressed;
sleep 30;

printf "\nBegin TR55 1091 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-8.txt --compressed;
sleep 1m;

printf "\nBegin TR55 2019 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-9.txt --compressed;
sleep 1m;

printf "\nBegin TR55 4130 Km\n";
curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-10.txt --compressed;
#sleep 2m;

#printf "\nBegin TR55 8018 Km\n";
#curl 'http://localhost:8000/api/modeling/start/tr55/' --data @tr55-11.txt --compressed;
