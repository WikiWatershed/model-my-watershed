"use strict";

var nunjucks = require('nunjucks'),
    modUtils = require('./modificationConfigUtils');

nunjucks.env.addFilter('tr55Name', function(val) {
    return modUtils.getHumanReadableName(val);
});

nunjucks.env.addFilter('tr55ShortName', function(val) {
    return modUtils.getHumanReadableShortName(val);
});

nunjucks.env.addFilter('tr55Summary', function(val) {
    return modUtils.getHumanReadableSummary(val);
});
