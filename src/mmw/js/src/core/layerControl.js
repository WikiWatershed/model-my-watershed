'use strict';

var L = require('leaflet'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    layerControlTmpl = require('./templates/layerControlContainer.html');

module.exports = L.Control.Layers.extend({
    // Somewhat copied from https://github.com/Leaflet/Leaflet/blob/master/src/control/Control.Layers.js,
    // with modifications to use a customer container element and our own way to toggle visibility.
    _initLayout: function() {
        var className = 'leaflet-control-layers',
            container = this._container = this._createContainer();

        this._form = $(container).find('form').get(0);

        // Copied directly from the parent class.
        // makes this work on IE touch devices by stopping it 
        // from firing a mouseout event when the touch is released
        container.setAttribute('aria-haspopup', true);

        // Copied directly from the parent class.
        if (!L.Browser.touch) {
            L.DomEvent
                .disableClickPropagation(container)
                .disableScrollPropagation(container);
        } else {
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
        }

        // Expand the layer control so that Leaflet
        // knows it's shown. We don't toggle this, but
        // instead we toggle visibility using our own
        // methods.
        this._expand();

        // Kept around so we don't have to override _update, even though
        // it's not used in the UI.
        this._separator = L.DomUtil.create('div', className + '-separator');

        // Add container element for each layer type
        this._baseLayersList = L.DomUtil.create('div', className + '-base',
                $(container).find("#basemap-layer-list").get(0));
        this._overlaysList = L.DomUtil.create('div', className + '-overlay',
                $(container).find("#overlays-layer-list").get(0));
    },

    _createContainer: function() {
        var container = new LayerControlView({}).render().el;

        return container;
    }
});

var LayerControlView = Marionette.ItemView.extend({
    template: layerControlTmpl,

    ui: {
        close: '.close',
        controlToggle: '.leaflet-bar-part',
        layerControl: '.leaflet-control-layers'
    },

    events: {
        'click @ui.close': 'close',
        'click @ui.controlToggle': 'toggle'
    },

    close: function() {
        this.$el.find(this.ui.layerControl).hide();
    },

    toggle: function() {
        this.$el.find(this.ui.layerControl).toggle();
    }
});
