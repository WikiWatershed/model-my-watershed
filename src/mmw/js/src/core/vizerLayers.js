'use strict';

var $ = require('jquery'),
    _ = require('underscore'),
    L = require('leaflet'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    PlotView = require('./modals/views').PlotView,
    measurementTmpl = require('./templates/measurement.html'),
    measurementsTmpl = require('./templates/measurements.html'),
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
        // If there are problems with the vizer URLs, don't hold up the creation
        // of the layer selector
        if (!vizerUrls.layers) {
            layersReady.resolve();
        }

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

var MeasurementView = Marionette.LayoutView.extend({
    tagName: 'tr',

    template: measurementTmpl,

    initialize: function(options) {
        this.options = options;
        this.model.set('showDepth', false);
    },

    ui: {
        'data': '.measurement-data'
    },

    events: {
        'click': 'showPlot'
    },

    showPlot: function() {
        this.options.showPlot(this.model.get('var_id'));
    }
});

var MeasurementsView = Marionette.CompositeView.extend({
    template: measurementsTmpl,

    childView: MeasurementView,

    childViewContainer: 'tbody',

    initialize: function(options) {
        this.options = options;
    },

    childViewOptions: function() {
        return this.options;
    }
});

var ObservationPopupView = Marionette.LayoutView.extend({
    template: popupTmpl,

    className: 'observation-popup',

    ui: {
        showPlotButton: 'button.show-plot'
    },

    events: {
        'click @ui.showPlotButton': 'showDefaultPlot'
    },

    regions: {
        measurementsRegion: '.measurements-region'
    },

    onRender: function() {
        this.measurementsRegion.show(new MeasurementsView({
            collection: new Backbone.Collection(this.model.get('measurements')),
            showPlot: _.bind(this.showPlot, this)
        }));
    },

    showDefaultPlot: function() {
        this.showPlot(this.model.get('measurements')[0].var_id);
    },

    showPlot: function(varId) {
        var plotModel = new Backbone.Model(_.extend(this.model.attributes, {
            currVarId: varId
        }));

        this.detailModal = new PlotView({model: plotModel}).render();
    }
});

module.exports = VizerLayers;
