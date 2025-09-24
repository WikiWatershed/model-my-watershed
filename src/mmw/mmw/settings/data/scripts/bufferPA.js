#!/usr/bin/env node

var turfBuffer = require('turf-buffer'),
    fs = require('fs');
    paPath = '../pa_perimeter.json',
    paBufPath = '../pa_buffered_perimeter.json',
    pa = require(paPath),
    distance = 3,
    unit = 'miles',
    paBuf = turfBuffer(pa, distance, unit);

fs.writeFileSync(paBufPath, JSON.stringify(paBuf));
