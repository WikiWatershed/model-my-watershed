"use strict";

var Backbone = require('../../../../shim/backbone'),
    _ = require('lodash'),
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

var Breaks = {
    catchment: {
        TotalN: [0, 2, 5, 10, 20],
        TotalP: [0, 0.2, 0.5, 1.0, 2.0],
        Sediment: [0, 200, 500, 1000, 2000],
    },
    stream: {
        TotalN: [0, 1, 3, 6, 12],
        TotalP: [0, 0.08, 0.2, 0.5, 1.0],
        Sediment: [0, 8, 20, 50, 150],
    }
};

var ColorSchemes = {
    catchment: [
        '#00A151',
        '#8BDE65',
        '#FCFFBC',
        '#FF9555',
        '#FF6B55',
        '#000000',
    ],
    stream: [
        '#007A39',
        '#00E72A',
        '#EBFF5B',
        '#FF6508',
        '#CB1A00',
        '#000000',
    ],
};

function makeColorRamp(values, colorScheme) {
    if (!(Array.isArray(values) && values.length === 5)) {
        console.error('Can only make a color ramp with 5 values.');
        return false;
    }

    var domain = values.concat([Number.MAX_VALUE]);

    return d3.scale.linear().domain(domain).range(colorScheme);
}

var ColorRamps = _.mapValues(Breaks, function(breakSets, scheme) {
    return _.mapValues(breakSets, function(breaks) {
        return makeColorRamp(breaks, ColorSchemes[scheme]);
    });
});

module.exports = {
    SubbasinTabModel: SubbasinTabModel,
    SubbasinTabCollection: SubbasinTabCollection,
    Breaks: Breaks,
    ColorSchemes: ColorSchemes,
    ColorRamps: ColorRamps,
};
