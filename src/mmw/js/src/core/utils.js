"use strict";

var L = require('leaflet'),
    _ = require('lodash'),
    md5 = require('blueimp-md5').md5,
    intersect = require('turf-intersect'),
    centroid = require('turf-centroid'),
    settings = require('./settings'),
    units = require('./units');

var noData = 'No Data';
var RELEASE_NOTES_BASE_URL = 'https://github.com/WikiWatershed/model-my-watershed/releases';
var MINOR_MAJOR_REGEX = /^[0-9]+\.[0-9]+\./; // Matches strings like 2.22.

var utils = {
    layerGroupZIndices: {
        base_layers: 0,
        coverage_layers: 1,
        stream_layers: 2,
        boundary_layers: 2
    },

    MAX_GEOLOCATION_AGE: 60000,

    MAPSHED: 'mapshed',

    GWLFE: 'gwlfe',

    TR55_TASK: 'tr55',

    TR55_PACKAGE: 'tr-55',

    ANALYZE: 'ANALYZE',

    MONITOR: 'MONITOR',

    MODEL: 'MODEL',

    CONUS: {
        NW: [-127.17,24.76],
        SE: [-66.53,50.4575]
    },

    splashPageTitle: settings.get('title'),

    selectAreaPageTitle: 'Choose Area of Interest',

    analyzePageTitle: 'Geospatial Analysis',

    dataCatalogPageTitle: 'Search Data Sources',

    comparePageTitle: 'Compare',

    projectsPageTitle: 'Projects',

    accountPageTitle: 'Account',

    filterNoData: function(data) {
        if (data && !isNaN(data) && isFinite(data)) {
            return data.toFixed(3);
        } else {
            return noData;
        }
    },

    // If the google layer wasn't ready to set up when the model was initialized,
    // initialize it
    loadGoogleLayer: function(layer) {
        if (window.google) {
            layer.set('leafletLayer', new L.Google(layer.get('googleType'), {
                maxZoom: layer.get('maxZoom')
            }));
        }
    },

    toggleLayer: function(selectedLayer, map, layerGroup) {
        var layers = layerGroup.get('layers');
        if (!selectedLayer.get('leafletLayer') && selectedLayer.get('googleType')) {
            this.loadGoogleLayer(selectedLayer);
        }
        var currentActiveLayers = layers.where({ active: true }),
             isInCurrentActive = _.includes(currentActiveLayers, selectedLayer);

        if (currentActiveLayers.length > 0) {
            // Works like a checkbox
            if (layerGroup.get('canSelectMultiple')) {
                if (isInCurrentActive) {
                    this._removeLayer(selectedLayer, map);
                } else {
                    this._addLayer(selectedLayer, layerGroup, map);
                }
            // Works like radio buttons
            } else {
                if (isInCurrentActive && !layerGroup.get('mustHaveActive')) {
                    this._removeLayer(selectedLayer, map);
                } else {
                    var currentActiveLayer = currentActiveLayers[0];
                    this._removeLayer(currentActiveLayer, map);
                    this._addLayer(selectedLayer, layerGroup, map);
                }
            }
        } else {
            this._addLayer(selectedLayer, layerGroup, map);
        }

        if (layerGroup.get('name') === "Basemaps") {
            map.fireEvent('baselayerchange', selectedLayer.get('leafletLayer'));
        }
        layerGroup.trigger('toggle:layer');
    },

    /**
     * Toggles a time period layer from the current layer's time period to the
     * the index stored in the group layer state.
     *
     * @param {LayerModel} layer - The selected layer model to add to the map
     * @param {LayerGroupModel} layerGroup - The layer group this layer belongs to
     * @param {Leaflet.Map} map - The map to add this layer to
     */
    toggleTimeLayer: function(selectedLayer, map, layerGroup) {
        this._removeLayer(selectedLayer, map);
        this._addLayer(selectedLayer, layerGroup, map);

        // Maintain the opacity value from the other time periods in the group
        var groupOpacity = layerGroup.get('selectedOpacityValue') / 100;
        selectedLayer.get('leafletLayer').setOpacity(groupOpacity);
    },

    /**
     * Remove a layer from the map.
     *
     * @param {LayerModel} layer - The selected layer model to remove
     * @param {Leaflet.Map} map - The map from which to remove
     */
    _removeLayer: function(layer, map) {
        layer.set('active', false);

        if (layer.get('hasOverLayers')) {
            map.removeLayer(layer.get('overLayers'));
        }

        map.removeLayer(layer.get('leafletLayer'));
    },

    /**
     * Set the new layer on the map.  If there are multiple time series layers
     * uses the most recently selected time period.
     *
     * @param {LayerModel} layer - The selected layer model to add to the map
     * @param {LayerGroupModel} layerGroup - The layer group this layer belongs to
     * @param {Leaflet.Map} map - The map to add this layer to
     */
    _addLayer: function(layer, layerGroup, map) {
        var hasTimeSlider = layer.get('hasTimeSlider'),
            hasOverLayers = layer.get('hasOverLayers'),
            leafletLayer = layer.get('leafletLayer'),
            bringToFront = layer.get('bringToFront');

        if (hasTimeSlider) {
            // If the layer has multiple time periods, use the most recently set
            // time period on the group for continuity.
            var timeLayerIdx = layerGroup.get('selectedTimeLayerIdx');
            leafletLayer = layer.get('timeLayers')[timeLayerIdx];
            layer.set('leafletLayer', leafletLayer);
        }

        layer.set('active', true);
        map.addLayer(leafletLayer);

        if(bringToFront) {
            leafletLayer.bringToFront();
        }

        if (hasOverLayers) {
            map.addLayer(layer.get('overLayers'));
        }
    },

    // A function for enabling/disabling modal buttons.  In additiion
    // to adding the disabled class, it is also important to somehow
    // note the fact that the button is disabled becaue there is an
    // "enter key" listener which ignores the CSS class.
    modalButtonToggle: function(model, $el, enabled) {
        $el.attr('disabled', !enabled);
        if (enabled === true) {
            $el.removeClass('disabled');
        } else if (enabled === false) {
            $el.addClass('disabled');
        }
    },

    modalButtonDisabled: function(model, $el) {
        return $el.attr('disabled') ? true : false;
    },

    // Given a map reference, returns a polygon of the current viewport
    viewportPolygon: function(map) {
        var mapBounds = map.getBounds(),
            viewportPolygon = {
                type: 'Feature',
                geometry: {
                    type: 'Polygon',
                    coordinates: [[
                        [mapBounds.getNorthEast().lng, mapBounds.getNorthEast().lat],
                        [mapBounds.getSouthEast().lng, mapBounds.getSouthEast().lat],
                        [mapBounds.getSouthWest().lng, mapBounds.getSouthWest().lat],
                        [mapBounds.getNorthWest().lng, mapBounds.getNorthWest().lat],
                        [mapBounds.getNorthEast().lng, mapBounds.getNorthEast().lat]
                    ]]
                }
            };

        return viewportPolygon;
    },

    // A function to enable/disable UI entries in response to zoom
    // level changes.
    zoomToggle: function(map, layerData, actOnUI, actOnLayer) {
        var toggleActiveLayers = function(e) {
                var zoom = e.target.getZoom();
                _.forEach(layerData, function(layerDatum) {
                    if (zoom < (layerDatum.minZoom || 0)) {
                        actOnUI(layerDatum, true);
                        actOnLayer(layerDatum);
                    } else if (zoom >= (layerDatum.minZoom || 0)) {
                        actOnUI(layerDatum, false);
                    }
                });
            };

        map.once('touchstart mouseover', toggleActiveLayers);
        map.on('zoomend', toggleActiveLayers);
    },

    // Toggles layers if the viewport overlaps with the perimeter of that layer
    // (if provided).
    perimeterToggle: function(map, layerData, actOnUI, actOnLayer) {
        function toggleCheck() {
            var viewportPolygon = utils.viewportPolygon(map);

            _.forEach(layerData, function(layerDatum) {
                var perimeter = layerDatum.perimeter;
                if (perimeter) {
                    actOnUI(layerDatum, true);
                    actOnLayer(layerDatum);
                    if (intersect(perimeter, viewportPolygon)) {
                        actOnUI(layerDatum, false);
                    }
                }
            });
        }

        map.on('moveend', function() {
            toggleCheck();
        });
        toggleCheck();
    },

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

    // A numeric comparator for ordinal numeric strings.
    ordinalNumericSort: function(x, y) {
        var other = 'Other';

        if (x.indexOf(other) > -1) {
            return 1;
        } else if (y.indexOf(other) > -1) {
            return -1;
        }

        return utils.numericSort(x.replace(/[^0-9]/g,''),
            y.replace(/[^0-9]/g,''));
    },

    noData: noData,

    noDataSort: function(x, y) {
        var trimmedX = x.trim(),
            trimmedY = y.trim();

        if (trimmedX === noData && trimmedY !== noData) {
            return -1;
        } else if (trimmedX === noData && trimmedY === noData) {
            return 0;
        } else if (trimmedX !== noData && trimmedY === noData) {
            return 1;
        }
        return utils.numericSort(x, y);
    },

    percentFormatter: function(value) {
        var trimmedVal = value.trim();
        if (trimmedVal === noData) {
            return trimmedVal;
        }
        return trimmedVal + '%';
    },


    negateString: function(str) {
        // From https://stackoverflow.com/a/5639070
        return String.fromCharCode.apply(String,
            _.map(str.split(""), function (c) {
                return 0xffff - c.charCodeAt();
            })
        );
    },

    // Parse query strings for Backbone
    // Takes queryString of format "key1=value1&key2=value2"
    // Returns object of format {key1: value1, key2: value2}
    // From http://stackoverflow.com/a/11671457/2053314
    parseQueryString: function(queryString) {
        var params = {};
        if (queryString) {
            _.forEach(
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
        var scheme = settings.get('unit_scheme'),
            minLargeValue = units[scheme].AREA_XL.factor;

        if (value >= minLargeValue) {
            return 'AREA_XL';
        } else {
            return 'AREA_M';
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

    filterOutOxygenDemand: function(element) {
        return element.measure !== "Biochemical Oxygen Demand";
    },


    // TR-55 runoff and water quality results are in the format:
    // {
    //     modified: ...,
    //     unmodified: ...,
    //     pc_unmodified: ...,
    // }
    // Use the scenario attributes to figure out which subresult should be
    // accessed.
    _getTR55ResultKey: function(scenario) {
        if (scenario.get('is_current_conditions')) {
            return 'unmodified';
        } else if (scenario.get('is_pre_columbian')) {
            return 'pc_unmodified';
        }
        return 'modified';
    },

    /** Access a scenario's result for a given type
     *   @param {ScenarioModel} scenario
     *   @param {string} typeKey: the type of result you want
     *                            back; 'runoff', 'quality'
     **/
    _getTR55ScenarioResult: function(scenario, typeKey) {
        var resultKey = this._getTR55ResultKey(scenario),
            result = scenario.get('results')
                             .findWhere({ name: typeKey})
                             .get('result');
        return result[typeKey][resultKey];
    },

    getTR55WaterQualityResult: function(scenario) {
        return this._getTR55ScenarioResult(scenario, 'quality');
    },

    getTR55RunoffResult: function(scenario) {
        return this._getTR55ScenarioResult(scenario, 'runoff');
    },

    // Reverse sorting of a Backbone Collection.
    // Taken from http://stackoverflow.com/a/12220415/2053314
    reverseSortBy: function(sortByFunction) {
        return function(left, right) {
            var l = sortByFunction(left),
                r = sortByFunction(right);

            if (l === undefined) {
                return -1;
            }
            if (r === undefined) {
                return 0;
            }

            return l < r ? 1 : l > r ? -1 : 0;
        };
    },

    totalForPointSourceCollection: function(collection, key) {
        return _.sum(_.map(collection, function(element) {
            return element.attributes[key] || 0;
        }));
    },

    geomForIdInCatchmentWaterQualityCollection: function(collection, key, id) {
        return _.find(collection, function(element) {
            return element.attributes[key] === id;
        }).attributes['geom'] || null;
    },

    findCenterOfShapeIntersection: function(shapeOne, shapeTwo) {
        var intersection = intersect(shapeOne, shapeTwo);
        return centroid(intersection);
    },

    // A JavaScript implementation for when we can't use the Nunjucks filter
    // Taken from http://stackoverflow.com/a/196991
    toTitleCase: function(str) {
        return str.replace(/\w\S*/g, function(txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    toRoundedLocaleString: function(val, n) {
        if (val === undefined || isNaN(val)) {
            return val;
        }

        return val.toLocaleString(undefined, {
            minimumFractionDigits: n,
            maximumFractionDigits: n,
        });
    },

    // Convert polygon to MultiPolyon (mutates original argument).
    toMultiPolygon: function toMultiPolygon(polygon) {
        var geom = polygon.geometry ? polygon.geometry : polygon;
        if (geom.type !== 'MultiPolygon') {
            if (geom.type === 'Polygon') {
                geom.coordinates = [geom.coordinates];
            } else if (geom.type === 'FeatureCollection') {
                return toMultiPolygon(geom.features[0]);
            }
            geom.type = 'MultiPolygon';
        }
        return geom;
    },

    // Round a number x to n decimal places
    round: function(x, n) {
        return Math.round(parseFloat(x) * Math.pow(10, n)) / Math.pow(10, n);
    },

    calculateVisibleRows: function(minScreenHeight, avgRowHeight, minRows) {
        var screenHeight = document.documentElement.clientHeight;
        if (screenHeight <= minScreenHeight) {
            return minRows;
        }

        return minRows + Math.floor((screenHeight - minScreenHeight) / avgRowHeight);
    },

    isWKAoIValid: function(wkaoi) {
        return wkaoi &&
               wkaoi.includes('__') &&
               !_.startsWith(wkaoi, '__') &&
               !_.endsWith(wkaoi, '__');
    },

    isWKAoIValidForSubbasinModeling: function(wkaoi) {
        if (!wkaoi) {
            return false;
        }
        var layerCode = wkaoi.split('__')[0];
        return layerCode === 'huc8' ||
               layerCode === 'huc10' ||
               layerCode === 'huc12';
    },

    // Array.filter(distinct) to get distinct values
    distinct: function(value, index, self) {
        return self.indexOf(value) === index;
    },

    // Takes a geometry and returns an array of its coordinates
    coordinates: function(geom) {
        switch(geom.type) {
            case 'MultiPolygon':
                return _.flatten(_.flatten(geom.coordinates));
            case 'Polygon':
                return _.flatten(geom.coordinates);
            case 'Point':
                return geom.coordinates;
            default:
                throw new Error('Unsupported geometry');
        }
    },

    _containedIn: function(perimeter, geom) {
        var coordCount = this.coordinates(geom).length,
            intersection = intersect(geom, perimeter),
            intersectionCount = intersection &&
                                this.coordinates(intersection.geometry).length;

        return intersection && coordCount === intersectionCount;
    },

    isInDrb: _.memoize(function(geom) {
        var DRB_SIMPLE_PERIMETER =
            _.find(settings.get('stream_layers'),
                   {code: 'drb_streams_v2'}).perimeter;

        return this._containedIn(DRB_SIMPLE_PERIMETER, geom);
    }),

    isInDrwi: _.memoize(function(geom) {
        var DRWI_SIMPLE_PERIMETER = settings.get('drwi_simple_perimeter');

        return this._containedIn(DRWI_SIMPLE_PERIMETER, geom);
    }),

    isInConus: _.memoize(function(geom) {
        var CONUS = settings.get('conus_perimeter');

        return this._containedIn(CONUS, geom);
    }),

    // Calculates a range from 0 to the upper bound
    // of the order of magnitde of the value. Returns
    // an object containing min and max.
    // e.g. rangeInMagnitude(50)    => {min:  0,   max: 100}
    //      rangeInMagnitude( 5)    => {min:  0,   max:  10}
    //      rangeInMagnitude( 0.5)  => {min:  0,   max:   1}
    //      rangeInMagnitude(-0.05) => {min: -0.1, max:   0}
    rangeInMagnitude: function(value) {
        var negative = value < 0,
            exponent = 1,
            min = 0,
            max;

        if (negative) {
            value *= -1;
        }

        if (value === 0) {
            return {min: 0, max: 1};
        }

        while (value < 1) {
            value *= 10;
            exponent -= 1;
        }

        while (value > 10) {
            value /= 10;
            exponent += 1;
        }

        max = Math.pow(10, exponent);

        if (negative) {
            min = -max;
            max = 0;
        }

        return {
            min: min,
            max: max
        };
    },

    // Parses version number from branch and git describe output
    // Outputs version number and release notes URL
    parseVersion: function(branch, gitDescribe) {
        var version = 'Unknown',
            url = RELEASE_NOTES_BASE_URL + '/latest';

        if (branch === null && gitDescribe === null) {
            version = 'Unknown';
        } else if (branch === 'local' && gitDescribe === null) {
            version = 'Local';
        } else if (branch.startsWith('release') || branch.startsWith('origin/release')) {
            version = branch.substr(branch.indexOf('release/') + 8);
            // Use this version for release notes
            url = RELEASE_NOTES_BASE_URL + '/tag/' + version;
        } else if (branch.startsWith('hotfix') || branch.startsWith('origin/hotfix')) {
            version = branch.substr(branch.indexOf('hotfix/') + 7);
            // Use the original release notes
            url = RELEASE_NOTES_BASE_URL + '/tag/' + version.match(MINOR_MAJOR_REGEX) + '0';
        } else {
            version = gitDescribe.substr(0, 18);
        }

        return {
            version: version,
            releaseNotesUrl: url
        };
    },

    // Parse Area Of Interest Name to return an object like to be formatted by
    // the view. It looks for (ID XXXX) at the end of the name and separates it
    // into a suffix. E.g.
    //     parseAoIName('Schuylkill, HUC-8 Watershed (ID 02040203)') =>
    //     { primary: 'Schuylkill, HUC-8 Watershed', suffix: '02040203' }
    parseAoIName: function(name) {
        if (!name) {
            return {
                primary: '',
                suffix: '',
            };
        }

        var idIndex = name.indexOf('(ID');

        return {
            primary: idIndex < 0 ? name :
                     name.substr(0, idIndex),
            suffix: idIndex < 0 ? '' :
                    name.substring(idIndex + 4, name.length - 1)
        };
    },

    // Downloads given data as a text file with given filename
    _downloadAsFile: function(data, filename, stringify) {
        var content = stringify ? JSON.stringify(data) : data,
            blob = new Blob([content],
                            { type: 'data:text/plain;charset=utf-8'}),
            url = URL.createObjectURL(blob),
            a = document.createElement('a');

        if (navigator.msSaveBlob) {
            // IE has a nicer interface for saving blobs
            navigator.msSaveBlob(blob, filename);
        } else {
            // Other browsers have to use a hidden link hack
            a.style.display = 'none';
            a.setAttribute('download', filename);
            a.setAttribute('href', url);

            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        URL.revokeObjectURL(url);
    },

    // Expects data to be a JSON object
    downloadJson: function(data, filename) {
        this._downloadAsFile(data, filename, true);
    },

    // Expects data to be a string
    downloadText: function(data, filename) {
        this._downloadAsFile(data, filename, false);
    },

    // Checks if current browser is Internet Explorer / Edge. If so,
    // returns its version number. Else, returns false.
    // Taken from https://codepen.io/gapcode/pen/vEJNZN
    getIEVersion: function() {
        var ua = window.navigator.userAgent;

        var msie = ua.indexOf('MSIE ');
        if (msie > 0) {
            // IE 10 or older => return version number
            return parseInt(ua.substring(msie + 5, ua.indexOf('.', msie)), 10);
        }

        var trident = ua.indexOf('Trident/');
        if (trident > 0) {
            // IE 11 => return version number
            var rv = ua.indexOf('rv:');
            return parseInt(ua.substring(rv + 3, ua.indexOf('.', rv)), 10);
        }

        var edge = ua.indexOf('Edge/');
        if (edge > 0) {
            // Edge (IE 12+) => return version number
            return parseInt(ua.substring(edge + 5, ua.indexOf('.', edge)), 10);
        }

        // other browser
        return false;
    },

    // Takes a string query, which is either "Lon,Lat" or "Lat,Lon",
    // and returns an object {lng: 99.9, lat: 99.9}. If the string
    // cannot be parsed in the expected way, returns false
    parseLocation: function(query) {
        if (!_.isString(query)) {
            return false;
        }

        if (query.indexOf(',') < 0) {
            return false;
        }

        var coords = _.compact(query.split(',').map(parseFloat)),
            result = { lat: NaN, lng: NaN };

        if (coords.length !== 2) {
            // String did not parse correctly
            return false;
        }

        if (coords[0] >= this.CONUS.NW[0] && coords[0] <= this.CONUS.SE[0]) {
            result.lng = coords[0];
            if (coords[1] >= this.CONUS.NW[1] && coords[1] <= this.CONUS.SE[1]) {
                result.lat = coords[1];
            } else {
                // Out of bounds
                return false;
            }
        } else if (coords[1] >= this.CONUS.NW[0] && coords[1] <= this.CONUS.SE[0]) {
            result.lng = coords[1];
            if (coords[0] >= this.CONUS.NW[1] && coords[0] <= this.CONUS.SE[1]) {
                result.lat = coords[0];
            } else {
                // Out of bounds
                return false;
            }
        } else {
            // Out of bounds
            return false;
        }

        return result;
    },

    // Convenience method for Google Tag Manager that mimics the
    // old Google Analytics API
    gtm: function(eventCategory, eventAction, eventLabel, eventValue) {
        var event = {
            'event': 'mmw',
            'eventCategory': eventCategory,
            'eventAction': eventAction,
            'eventLabel': eventLabel,
        };

        if (eventValue) {
            event.eventValue = eventValue;
        }

        window.dataLayer.push(event);
    },
};

module.exports = utils;
