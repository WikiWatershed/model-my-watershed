"use strict";

var _ = require('underscore');

var utils = {
    // Parse query strings for Backbone
    // Takes queryString of format "key1=value1&key2=value2"
    // Returns object of format {key1: value1, key2: value2}
    // From http://stackoverflow.com/a/11671457/2053314
    parseQueryString: function (queryString){
        var params = {};
        if(queryString){
            _.each(
                _.map(decodeURI(queryString).split(/&/g),function(el){
                    var aux = el.split('='), o = {};
                    if(aux.length >= 1){
                        var val;
                        if(aux.length === 2) {
                            val = aux[1];
                        }
                        o[aux[0]] = val;
                    }
                    return o;
                }),
                function(o){
                    _.extend(params,o);
                }
            );
        }
        return params;
    }
};

module.exports = utils;
