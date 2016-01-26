"use strict";

var nunjucks = require('nunjucks');

nunjucks.env.addFilter('toFixed', function(val, digits) {
    return val.toFixed(digits);
});
