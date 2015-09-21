"use strict";

var _ = require('underscore'),
    md5 = require('blueimp-md5').md5;

var M2_IN_KM2 = 1000000;

var utils = {
    // A numeric comparator for strings.
    numericSort: function(_x, _y) {
        var x = parseFloat(_x.toString().replace(/[^0-9.]/g, '')),
            y = parseFloat(_y.toString().replace(/[^0-9.]/g, ''));

        if (x < y) {
            return -1;
        } else if (x === y) {
            return 0;
        } else {
            return 1;
        }
    },

    // Parse query strings for Backbone
    // Takes queryString of format "key1=value1&key2=value2"
    // Returns object of format {key1: value1, key2: value2}
    // From http://stackoverflow.com/a/11671457/2053314
    parseQueryString: function(queryString) {
        var params = {};
        if (queryString) {
            _.each(
                _.map(decodeURI(queryString).split(/&/g), function(el) {
                    var aux = el.split('='), o = {};
                    if (aux.length >= 1) {
                        var val;
                        if (aux.length === 2) {
                            val = aux[1];
                        }
                        o[aux[0]] = val;
                    }
                    return o;
                }),
                function(o) {
                    _.extend(params,o);
                }
            );
        }
        return params;
    },

    /**
     * Returns the value of a query param from the URL if it exists or null:
     * https://stackoverflow.com/questions/901115
     */
    getParameterByName: function(name) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
            results = regex.exec(location.search);
        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    },

    // Convert a backbone collection into a canonical MD5 hash
    getCollectionHash: function(collection) {
        // JSON objects are not guaranteed consistent order in string
        // representation, so we convert to sorted array which can be
        // stringified reliably.

        // Converts an object with JSON representation:
        //     {name: 'abc', type: 'xyz', shape: [...]}
        // to:
        //     [{name: 'abc'}, {shape: [...]}, {type: 'xyz'}]
        var objectToSortedArray = function(object) {
                var sorted = [];
                Object.keys(object).sort().forEach(function(key) {
                    var kvPair = {},
                        value = object[key];
                    // Recursively sort nested objects
                    if (_.isObject(value) && value !== null && !_.isArray(value)) {
                        value = objectToSortedArray(value);
                    }
                    kvPair[key] = value;
                    sorted.push(kvPair);
                });

                return sorted;
            },
            // Convert each model to a sorted array
            sortedCollection = collection.map(function(model) {
                return objectToSortedArray(model.toJSON());
            });

        return md5(JSON.stringify(sortedCollection));
    },

    magnitudeOfArea: function(value) {
        if (value >= M2_IN_KM2) {
            return 'km2';
        } else {
            return 'm2';
        }
    },

    changeOfAreaUnits: function(value, fromUnit, toUnit) {
        var fromTo = (fromUnit + ':' + toUnit).toLowerCase();

        switch (fromTo) {
            case 'm2:km2':
                 return value / M2_IN_KM2;
            case 'm2:m2':
                 return value;
            default:
                 throw 'Conversion not implemented.';
        }
    },

    convertToMetric: function(value, fromUnit) {
        fromUnit = fromUnit.toLowerCase();
        switch (fromUnit) {
            case 'in':
                // return cm.
                return value * 2.54;

            case 'ft':
                // return meters.
                return value * 0.3048;

            case 'mi':
                // return km.
                return value * 1.60934;

            case 'lb':
                // return kg.
                return value * 0.453592;

            default:
                throw 'Conversion not implemented.';
        }
    },

    convertToImperial: function(value, fromUnit) {
        fromUnit = fromUnit.toLowerCase();
        switch (fromUnit) {
            case 'cm':
                // return in.
                return value * 0.393701;

            case 'm':
                // return feet.
                return value * 3.28084;

            case 'km':
                // return miles.
                return value * 0.621371;

            case 'kg':
                // return Lbs.
                return value * 2.20462;

            default:
                throw 'Conversion not implemented.';
        }
    }
};

module.exports = utils;
