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

nunjucks.env.addFilter('toDateWithoutTime', function(date) {
    var fullDate = new Date(date);

    return (fullDate.getUTCMonth() + 1) + '/' +
           fullDate.getUTCDate() + '/' +
           fullDate.getUTCFullYear();
});

nunjucks.env.addFilter('toTimeAgo', function(date) {
    var diff = Date.now() - (new Date(date)).getTime(),
        secs = diff / 1000,
        mins = secs / 60,
        hrs  = mins / 60,
        days = hrs  / 24,
        wks  = days / 7,
        mths = days / 30,
        yrs  = days / 365;

    if (yrs > 1) {
        return Math.floor(yrs) + " years ago";
    } else if (mths > 1) {
        return Math.floor(mths) + " months ago";
    } else if (wks > 1) {
        return Math.floor(wks) + " weeks ago";
    } else if (days > 1) {
        return Math.floor(days) + " days ago";
    } else if (hrs > 1) {
        return Math.floor(hrs) + " hours ago";
    } else if (mins > 1) {
        return Math.floor(mins) + " minutes ago";
    } else {
        return Math.floor(secs) + " seconds ago";
    }
});

nunjucks.env.addFilter('split', function(str, splitChar, indexToReturn) {
    var items = str.split(splitChar);

    return items[indexToReturn];
});
