"use strict";

var Backbone = require('../../../../shim/backbone'),
    d3 = require('d3');

var SubbasinTabModel = Backbone.Model.extend({
    defaults: {
        displayName: '',
        name: '',
    },
});

var SubbasinTabCollection = Backbone.Collection.extend({
    model: SubbasinTabModel,
});

// Matching $streamWaterQualityColors in _variables.scss
var SubbasinColorScheme = [
    '#1a9641',
    '#a6d96a',
    '#ffffbf',
    '#fdae61',
    '#d7191c',
    '#42090a',
    '#000000',
];

function makeColorRamp(values) {
    if (!(Array.isArray(values) && values.length === 5)) {
        console.error('Can only make a color ramp with 5 values.');
        return false;
    }

    // Add 1 after the end of given range, and MAX_VALUE to the very end,
    // to allow for fade from dark red to black for overflow values.
    var domain = values.concat([values[4] + 1, Number.MAX_VALUE]);

    return d3.scale.linear().domain(domain).range(SubbasinColorScheme);
}

module.exports = {
    SubbasinTabModel: SubbasinTabModel,
    SubbasinTabCollection: SubbasinTabCollection,
    makeColorRamp: makeColorRamp,
};
