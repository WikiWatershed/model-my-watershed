'use strict';

var L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    streamSliderTmpl = require('./templates/streamSlider.html'),
    settings = require('./settings');

module.exports = L.Control.extend({
    options: {
        position: 'bottomright'
    },

    initialize: function (options) {
        L.Util.setOptions(this, options);
        this.streamFeatures = L.featureGroup();
    },

    onAdd: function(map) {
        var container = this.createContainer();
        // Copied directly from the parent class.
        if (!L.Browser.touch) {
            L.DomEvent
                .disableClickPropagation(container)
                .disableScrollPropagation(container);
        } else {
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
        }
        this.streamFeatures.addTo(map);
        return container;
    },

    createContainer: function() {
        var container = new StreamSliderView({
            streamFeatures: this.streamFeatures 
        }).render().el;
        return container;
    }
});

var StreamSliderView = Marionette.ItemView.extend({
    template: streamSliderTmpl,

    ui: {
        close: '.close',
        controlToggle: '.leaflet-bar-part',
        slider: '#stream-slider',
        displayValue: '#stream-value',
        streamControl: '.leaflet-control-stream'
    },

    events: {
        'click @ui.close': 'close',
        'click @ui.controlToggle': 'toggle',
        'input @ui.slider': 'onSliderDragged',
        'change @ui.slider': 'onSliderChanged'
    },

    initialize: function(options) {
        this.streamFeatures = options.streamFeatures;
        this.streamLayers = settings.get('stream_layers');
    },

    onShow: function() {
        this.onSliderDragged();
    },

    getSliderIndex: function() {
        return parseInt(this.ui.slider.val());
    },

    getSliderDisplay: function() {
        var ind = this.getSliderIndex();
        if (ind === 0) {
            return 'Off';
        } else {
            return this.streamLayers[ind-1].display;
        }
    },
    
    close: function() {
        this.$el.find(this.ui.streamControl).hide();
    },

    toggle: function() {
        this.$el.find(this.ui.streamControl).toggle();
    },

    onSliderDragged: function() {
        // Preview slider value while dragging.
        this.ui.displayValue.text(this.getSliderDisplay());
    },

    onSliderChanged: function() {
        var ind = this.getSliderIndex();
        clearStreamLayer(this.streamFeatures);
        if (ind > 0) {
            var streamLayer = this.streamLayers[ind-1];
            changeStreamLayer(streamLayer.url, this.streamFeatures);
        }
        this.ui.slider.attr('value', ind);
    }
});

function clearStreamLayer(streamFeatures) {
    streamFeatures.clearLayers();
}

function changeStreamLayer(url, streamFeatures) {
    var streamLayer = new L.TileLayer(url + '.png');

    streamFeatures.addLayer(streamLayer);
    streamLayer.bringToFront();
}
