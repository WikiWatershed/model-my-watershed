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

nunjucks.env.addFilter('toFriendlyDate', function(date) {
    return new Date(date).toLocaleString();
});
