"use strict";

var nunjucks = require('nunjucks');
var utils = require('./utils');
var _ = require('lodash');
var moment = require('moment');

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

nunjucks.env.addFilter('toDateWithoutTime', function(date) {
    var fullDate = new Date(date);

    return (fullDate.getUTCMonth() + 1) + '/' +
           fullDate.getUTCDate() + '/' +
           fullDate.getUTCFullYear();
});

nunjucks.env.addFilter('toTimeAgo', function(date) {
    return moment(date).fromNow();
});

nunjucks.env.addFilter('split', function(str, splitChar, indexToReturn) {
    var items = str.split(splitChar);

    return items[indexToReturn];
});

nunjucks.env.addFilter('toFriendlyBytes', function(bytes) {
    var roundToOneDecimal = function(x) { return Math.round(x * 10) / 10; };

    if (bytes < 1024) {
        return bytes + '&nbsp;Bytes';
    }

    bytes /= 1024;

    if (bytes < 1024) {
        return roundToOneDecimal(bytes) + '&nbsp;KB';
    }

    bytes /= 1024;

    if (bytes < 1024) {
        return roundToOneDecimal(bytes) + '&nbsp;MB';
    }

    bytes /= 1024;

    return roundToOneDecimal(bytes) + '&nbsp;GB';
});
