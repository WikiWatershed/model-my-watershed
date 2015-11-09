'use strict';

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet');

// These are likely temporary until we develop custom icons for each type
var platformIcons = {
        'River Guage': '#F44336',
        'Weather Station': '#2196F3',
        'Fixed Shore Platform': '#4CAF50',
        'Soil Pit': '#FFEB3B',
        'Well': '#795548'
    };

function VizerLayers(layerUrl) {
    var layersReady = $.Deferred();

    this.getLayers = function() {
        $.getJSON(layerUrl, function(assets) {
            // A list of all assets (typically sensor devices) and the variables
            // they manage, along with various meta data grouped by the data
            // provider which acts as the "layer" which can be toggled on/off
            var layerAssets = _.groupBy(assets.result, 'provider');
            var layers = _.map(layerAssets, function(assets, provider) {

                // Create a marker for each asset point in this layer and
                // use the appropriate style for the platform type
                var label = makeProviderLabel(provider, assets),
                    markers = _.map(assets, function(asset) {
                        var color = _.has(platformIcons, asset.platform_type) ?
                                platformIcons[asset.platform_type] :
                                '#607D8B';

                        return L.circleMarker([asset.lat, asset.lon], {
                            attributes: asset,
                            fillColor: color,
                            fillOpacity: 1.0
                        });
                    });

                return [label, L.featureGroup(markers)];
            });

            // All layers are loaded have have markers created for all assets
            layersReady.resolve(_.object(layers));
        });

        return layersReady;
    };
}

function makeProviderLabel(provider, assets) {
    // Create a label for the layer selector.
    return provider + ' (' + assets.length + ')';
}

module.exports = VizerLayers;
