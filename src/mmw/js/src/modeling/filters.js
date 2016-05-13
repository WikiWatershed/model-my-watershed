"use strict";

var nunjucks = require('nunjucks'),
    modUtils = require('./modificationConfigUtils');

nunjucks.env.addFilter('modName', function(val) {
    return modUtils.getHumanReadableName(val);
});

nunjucks.env.addFilter('modShortName', function(val) {
    return modUtils.getHumanReadableShortName(val);
});

nunjucks.env.addFilter('modSummary', function(val) {
    return modUtils.getHumanReadableSummary(val);
});

nunjucks.env.addFilter('modFill', function(val) {
    return modUtils.getDrawOpts(val).fillColor;
});
