#!/usr/bin/env node

var turfBuffer = require('turf-buffer'),
    fs = require('fs');
    drwiPath = '../drwi_perimeter.json',
    drwiBufPath = '../drwi_buffered_perimeter.json',
    drwi = require(drwiPath),
    distance = 3,
    unit = 'miles',
    drwiBuf = turfBuffer(drwi, distance, unit);

fs.writeFileSync(drwiBufPath, JSON.stringify(drwiBuf));
