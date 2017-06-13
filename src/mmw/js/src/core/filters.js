"use strict";

var nunjucks = require('nunjucks');
var utils = require('./utils');
var _ = require('lodash');

nunjucks.env = new nunjucks.Environment();

if (window.hasOwnProperty('Intl')) {
    // Intl is available, we should use the faster NumberFormat
    var basicFormatter = new Intl.NumberFormat('en'),
        minDigitFormatter = function(n) {
            return new Intl.NumberFormat('en', { minimumFractionDigits: n });
        },
        cachedMinDigitFormatter = _.memoize(minDigitFormatter);

    var toLocaleStringFormatter = function(val, n) {
        if (val === undefined || isNaN(val)) {
            return val;
        }

        if (n) {
            return cachedMinDigitFormatter(n).format(val);
        } else {
            return basicFormatter.format(val);
        }
    };
} else {
    // Intl is not available, we should use the more compatible toLocaleString
    var toLocaleStringFormatter = function(val, n) {
        if (val === undefined || isNaN(val)) {
            return val;
        }

        if (n) {
            return val.toLocaleString('en', { minimumFractionDigits: n });
        } else {
            return val.toLocaleString('en');
        }
    };
}

nunjucks.env.addFilter('toLocaleString', toLocaleStringFormatter);

nunjucks.env.addFilter('filterNoData', utils.filterNoData);

nunjucks.env.addFilter('toFriendlyDate', function(date) {
    return new Date(date).toLocaleString();
});

nunjucks.env.addFilter('toDateFullYear', function(date) {
    return new Date(date).getFullYear();
});
