#!/usr/bin/env node

var turfBuffer = require('turf-buffer'),
    fs = require('fs');
    drbPath = '../drb_perimeter.json',
    drbBufPath = '../drb_buf_3_perimeter.json',
    drb = require(drbPath),
    distance = 3,
    unit = 'miles',
    drbBuf = turfBuffer(drb, distance, unit);

fs.writeFileSync(drbBufPath, JSON.stringify(drbBuf));
