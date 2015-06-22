"use strict";

var nunjucks = require('nunjucks');

nunjucks.env = new nunjucks.Environment();

nunjucks.env.addFilter('toLocaleString', function(val) {
    return val.toLocaleString('en');
});
