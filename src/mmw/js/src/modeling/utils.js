"use strict";

var _ = require('lodash'),
    App = require('../app');

module.exports = {
    isEditable: function(scenario) {
        return App.user.userMatch(scenario.get('user_id'));
    },

    // Given a path like 'https://mmw-staging-data-us-east-1.s3.amazonaws.com/p1470/s2603/phillyRCP4520802100daily.csv?AWSAccessKeyId=XXX&Expires=1589820561&x-amz-security-token=YYY&Signature=ZZZ' and an extension '.csv',
    // returns the file name 'phillyRCP4520802100daily.csv'.
    getFileName: function(path, ext) {
        if (!_.isString(path) || path.length < 1) {
            return false;
        }

        var filenameWithQuerystring = path.substring(path.lastIndexOf('/') + 1);

        if (!_.isString(ext) || ext.length < 1) {
            return filenameWithQuerystring;
        }

        return filenameWithQuerystring.substring(
            0, filenameWithQuerystring.indexOf(ext) + ext.length);
    },

    /**
     * Takes an object mapping NLCD keys to values, and returns
     * a Mapshed equivalent array of values.
     *
     * In sync with app.modeling.mapshed.calcs.landuse_pcts
     */
    nlcdToMapshedLandCover: function(input) {
        var nlcd = function(v) { return _.get(input, v, 0); };

        return [
            nlcd(81),  // Hay/Pasture
            nlcd(82),  // Cropland
            nlcd(41) + nlcd(42) +
            nlcd(43) + nlcd(52),  // Forest
            nlcd(90) + nlcd(95),  // Wetland
            0,  // Disturbed
            0,  // Turf Grass
            nlcd(71),  // Open Land
            nlcd(12) + nlcd(31),  // Bare Rock
            0,  // Sandy Areas
            0,  // Unpaved Road
            nlcd(22),  // Low Density Mixed
            nlcd(23),  // Medium Density Mixed
            nlcd(24),  // High Density Mixed
            nlcd(21),  // Low Density Residential
            0,  // Medium Density Residential
            0,  // High Density Residential
        ];
    },

    /**
     * Takes a layer_overrides object and converts it to a Land Cover Type
     * identifier. Defaults to "land_2019_2019"
     * 
     * e.g. {"__LAND__": "nlcd-2011-30m-epsg5070-512-int8"} -> "land_2011_2011"
     */
    layerOverrideToDefaultLandCoverType: function(layer_overrides) {
        var raster = layer_overrides && _.get(layer_overrides, "__LAND__"),
            mapping = {
                "nlcd-2019-30m-epsg5070-512-byte": "land_2019_2019",
                "nlcd-2016-30m-epsg5070-512-byte": "land_2019_2016",
                "nlcd-2011-30m-epsg5070-512-byte": "land_2019_2011",
                "nlcd-2006-30m-epsg5070-512-byte": "land_2019_2006",
                "nlcd-2001-30m-epsg5070-512-byte": "land_2019_2001",
                "nlcd-2011-30m-epsg5070-512-int8": "land_2011_2011",
            };

        if (!raster) {
            return "land_2019_2019";
        }

        if (_.has(mapping, raster)) {
            return mapping[raster];
        }

        throw new Error('Invalid layer override: ' + raster);
    },
};
