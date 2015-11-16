'use strict';

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    PlotView = require('./modals/views').PlotView,
    popupTmpl = require('./templates/observationPopup.html'),
    vizerUrls = require('./settings').get('vizer_urls');

// These are likely temporary until we develop custom icons for each type
var platformIcons = {
        'River Guage': '#F44336',
        'Weather Station': '#2196F3',
        'Fixed Shore Platform': '#4CAF50',
        'Soil Pit': '#FFEB3B',
        'Well': '#795548'
    };

function VizerLayers() {
    var layersReady = $.Deferred();

    this.getLayers = function() {
        $.getJSON(vizerUrls.layers, function(assets) {
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

                var layer = L.featureGroup(markers);
                attachPopups(layer);

                return [label, layer];
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

function attachPopups(featureGroup) {
    featureGroup.eachLayer(function(marker) {
        var model = new Backbone.Model(marker.options.attributes),
            view = new ObservationPopupView({model: model});

        marker.bindPopup(view.render().el);
        marker.on('popupopen', function(popupEvent) {
            // When the popup is opened, fetch the recent values of
            // this asset's measurements and update the Popup
            var id = popupEvent.target.options.attributes.siso_id,
                url =  vizerUrls.recent.replace(/{{asset_id}}/, id);

            $.getJSON(url, _.partial(updatePopup, popupEvent.popup, model));
        });
    });
}

/* Update an existing popup with model values merged with a single measurement
 * result for each category (variable) available in the asset */
function updatePopup(popup, model, recentValues) {
    var values = _.map(model.get('measurements'), function(category) {
        var measurement = _.findWhere(recentValues.result, {var_id: category.var_id});

        if (measurement) {
            measurement.lastUpdated = new Date(measurement.time * 1000); // seconds -> ms
        }

        return _.extend(category, measurement);
    });

    model.set('measurements', values);

    var view = new ObservationPopupView({model: model});
    popup.setContent(view.render().el);
    popup.update();
}

var ObservationPopupView = Marionette.ItemView.extend({
    template: popupTmpl,

    ui: {
        'variable': '.observation-measurements li'
    },

    events: {
        'click @ui.variable': 'loadVariablePlot'
    },

    detailModal: null,

    loadVariablePlot: function(e) {
        var varId = $(e.currentTarget).data('varId'),
            assetId = $(e.currentTarget).data('assetId'),
            dataUrl = vizerUrls.variable
                .replace(/{{var_id}}/, varId)
                .replace(/{{asset_id}}/, assetId),
            displayPlot = _.bind(this.displayPlot, this, varId);

        this.loadPlotData(dataUrl).then(displayPlot);
    },

    loadPlotData: function(url) {
        var loadedDeferred = $.Deferred();

        $.getJSON(url, function(observation) {
            // Handle cases where there is no data
            if (!observation.success) {
                loadedDeferred.resolve();
            } else {
                var rawVizerSeries = _.first(observation.result).data,
                    series = _.map(rawVizerSeries, function(measurement) {
                        return [measurement.time * 1000, measurement.value];
                    });

                loadedDeferred.resolve(series);
            }
        });

        return loadedDeferred;
    },

    displayPlot: function(varId, series) {
        var plotModel = new Backbone.Model(_.extend(this.model.attributes, {
            series: series,
            varId: varId
        }));

        if (this.detailModal) {
            this.detailModal.hide();
        }

        this.detailModal = new PlotView({model: plotModel}).render();
    }
});

module.exports = VizerLayers;
