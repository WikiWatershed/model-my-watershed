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
        '#00602D',
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

module.exports = {
    SubbasinTabModel: SubbasinTabModel,
    SubbasinTabCollection: SubbasinTabCollection,
    makeColorRamp: makeColorRamp,
    ColorSchemes: ColorSchemes,
};
