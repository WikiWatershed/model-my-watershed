"use strict";

var _ = require('lodash'),
    turfArea = require('turf-area'),
    App = require('../../../app');

/**
 * This module exports a set of objects for calculating outputs of, and auto-
 * estimatates for, a manual entry field for GWLF-E.
 *
 * Each calculator object has two methods: `toOutput` which given a user
 * value converts it to the expected GMS format, and `getAutoValue` that
 * gets a user-friendly value from the GMS dataModel given a field name.
 *
 * Each manual entry field will be configured with one of these calculators.
 */

module.exports = {
    // Takes the userValue and uses it directly in the output
    Direct: {
        toOutput: function(userValue) {
            return userValue;
        },
        getAutoValue: function(fieldName, dataModel) {
            return dataModel[fieldName];
        },
    },

    // Always returns the same static value
    Static: function(staticValue) {
        return {
            toOutput: function() {
                return staticValue;
            },
            getAutoValue: function() {
                return staticValue;
            },
        };
    },

    // Takes the userValue and makes an array with the value repeated 12 times
    Array12: {
        toOutput: function(userValue) {
            return _.fill(new Array(12), userValue);
        },
        getAutoValue: function(fieldName, dataModel) {
            return dataModel[fieldName][0];
        },
    },

    // Takes the userValue and divides into an array of 12 values evenly
    EqualMonths: {
        toOutput: function(userValue) {
            return _.fill(new Array(12), userValue / 12);
        },
        getAutoValue: function(fieldName, dataModel) {
            return _.sum(dataModel[fieldName]);
        },
    },

    // Takes the user value in million gallons per day and converts it to
    // centimeters per month, and applies it to twelve months. Equivalent to
    // point_source_discharge method in mapshed/calcs.py
    PointSourceDischarge: {
        toOutput: function(userValue) {
            var MONTHDAYS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
                AREA_SQM = turfArea(App.currentProject.get('area_of_interest')),
                M3_PER_MGAL = 3785.41178,
                CM_PER_M = 100.0;

            return MONTHDAYS.map(function(DAYS_PER_MONTH) {
                return userValue *
                    (DAYS_PER_MONTH * M3_PER_MGAL * CM_PER_M / AREA_SQM);
            });
        },
        getAutoValue: function(fieldName, dataModel) {
            var DAYS_PER_YEAR = 365,
                AREA_SQM = turfArea(App.currentProject.get('area_of_interest')),
                M3_PER_MGAL = 3785.41178,
                CM_PER_M = 100.0;

            return _.sum(dataModel[fieldName]) /
                (DAYS_PER_YEAR * M3_PER_MGAL * CM_PER_M / AREA_SQM);
        },
    },

    // Corresponds to a certain index of a given array. The fieldName must be
    // in the format {ArrayName}__{index}
    ArrayIndex: {
        toOutput: function(userValue) {
            return userValue;
        },
        getAutoValue: function(fieldName, dataModel) {
            var arrayIndex = fieldName.split('__'),
                arrayName = arrayIndex[0],
                index = parseInt(arrayIndex[1]);

            return dataModel[arrayName][index];
        },
    }
};
