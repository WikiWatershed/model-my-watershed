"use strict";

var nunjucks = require('nunjucks');

nunjucks.env = new nunjucks.Environment();

nunjucks.env.addFilter('toLocaleString', function(val, n) {
    if (n) {
        return val.toLocaleString('en', {minimumFractionDigits: n});
    } else {
        return val.toLocaleString('en');
    }
});
