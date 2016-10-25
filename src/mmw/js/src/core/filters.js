"use strict";

var nunjucks = require('nunjucks');
var utils = require('./utils');
var _ = require('lodash');

nunjucks.env = new nunjucks.Environment();

var basicFormatter = new Intl.NumberFormat('en');

var specificFormatter = function(sigFig) {
    return new Intl.NumberFormat('en',{minimumFractionDigits: sigFig});
};

var cachedFormatters = _.memoize(specificFormatter);

nunjucks.env.addFilter('toLocaleString', function(val, n) {
    if (val===undefined || isNaN(val)) {
        return val;
    }

    if (n) {
        return cachedFormatters(n).format(val);
    } else {
        return basicFormatter.format(val);
    }
});

nunjucks.env.addFilter('filterNoData', utils.filterNoData);

nunjucks.env.addFilter('toFriendlyDate', function(date) {
    return new Date(date).toLocaleString();
});

