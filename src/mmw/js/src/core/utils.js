"use strict";

var _ = require('underscore'),
    md5 = require('blueimp-md5').md5;

var utils = {
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
    }
};

module.exports = utils;
