'use strict';

var L = require('leaflet'),
    $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../shim/backbone.marionette'),
    layerControlListTmpl = require('./templates/layerControlList.html'),
    layerControlButtonTmpl = require('./templates/layerControlButton.html');

module.exports = L.Control.Layers.extend({

    // Copied from  https://github.com/Leaflet/Leaflet/blob/master/src/control/Control.Layers.js
    // with modifications for allowing a third layer type (observations)
    initialize: function (baseLayers, overlays, observationsDeferred, options) {
        var self = this;

        L.setOptions(this, options);

        this._layers = {};
        this._lastZIndex = 0;
        this._handlingClick = false;

        for (var i in baseLayers) {
            this._addLayer(baseLayers[i], i);
        }

        for (i in overlays) {
            this._addLayer(overlays[i], i, 'overlay');
        }

        observationsDeferred
            .done(function(observationLayers) {
                for (i in observationLayers) {
                    self._addLayer(observationLayers[i], i, 'observation');
                }

                // Redraw the UI with the new layers
                self._update();
            })
            .fail(function(reason) {
                $('#observations-layer-list').text(reason);
            });
    },

    // Somewhat copied from https://github.com/Leaflet/Leaflet/blob/master/src/control/Control.Layers.js,
    // with modifications to use a customer container element and our own way to toggle visibility.
    _initLayout: function() {
        var className = 'leaflet-control-layers',
            container = this._container = new LayerControlButtonView({}).render().el,
            listContainer = this._listContainer = new LayerControlListView({}).render().el;

        this._form = $(listContainer).find('form').get(0);

        // Copied directly from the parent class.
        // makes this work on IE touch devices by stopping it
        // from firing a mouseout event when the touch is released
        container.setAttribute('aria-haspopup', true);

        // Copied directly from the parent class.
        if (!L.Browser.touch) {
            L.DomEvent
                .disableClickPropagation(container)
                .disableScrollPropagation(container);

            L.DomEvent
                .disableClickPropagation(listContainer)
                .disableScrollPropagation(listContainer);
        } else {
            L.DomEvent.on(container, 'click', L.DomEvent.stopPropagation);
            L.DomEvent.on(listContainer, 'click', L.DomEvent.stopPropagation);
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
                $(listContainer).find("#basemap-layer-list").get(0));
        this._overlaysList = L.DomUtil.create('div', className + '-overlay',
                $(listContainer).find("#overlays-layer-list").get(0));
        this._observationList = L.DomUtil.create('div', className + '-observation',
                $(listContainer).find("#observations-layer-list").get(0));

        // Add the layer control list as a sibling to the map.
        // This lets us control the size of the list based
        // on the height of the map.
        $('#map').append(listContainer);
    },

    // Overrides the parent class and allows separation of overlay layers
    // by type.
    _addItem: function (obj) {
        var label = document.createElement('label'),
            checked = this._map.hasLayer(obj.layer),
            input,
            controlName = 'leaflet-overlay-layers';

        if (obj.overlay && obj.overlayType === 'observation') {
            controlName = 'leaflet-control-layers-observation';
            input = document.createElement('input');
            input.type = 'checkbox';
            input.className = 'leaflet-control-layers-selector';
            input.defaultChecked = checked;
        } else if (obj.overlay) {
            controlName += obj.overlayType;
            input = this._createRadioElement(controlName, checked, obj.overlayType);
        } else {
            input = this._createRadioElement(controlName, checked);
        }

        input.layerId = L.stamp(obj.layer);
        if (obj.overlay && obj.layer && obj.layer.options && obj.layer.options.code) {
            $(input).attr('id', obj.layer.options.code);
        }

        L.DomEvent.on(input, 'click', this._onInputClick, this);

        var name = document.createElement('span');
        name.innerHTML = ' ' + obj.name;

        // Helps from preventing layer control flicker when checkboxes are disabled
        // https://github.com/Leaflet/Leaflet/issues/2771
        var holder = document.createElement('div');

        label.appendChild(holder);
        holder.appendChild(input);
        holder.appendChild(name);

        if (obj.empty) {
            name.innerHTML = ' None';
            input.checked = true;
        }

        if (_.contains(['stream', 'raster', 'vector'], obj.overlayType)) {
             var subcontainer = document.getElementById('overlay-subclass-' + obj.overlayType);
             if (subcontainer === null) {
                 subcontainer = document.createElement('div');
                 subcontainer.id = 'overlay-subclass-' + obj.overlayType;
                 this._overlaysList.appendChild(subcontainer);

                 var title;
                 if (obj.overlayType === 'vector') {
                     title = 'Boundary';
                 } else if (obj.overlayType === 'raster') {
                     title = 'Coverage';
                 } else if (obj.overlayType === 'stream') {
                     title = 'Streams';
                 }

                 var textNode = document.createElement('h4');
                 textNode.innerHTML = title;
                 subcontainer.appendChild(textNode);
             }
             subcontainer.appendChild(label);
        } else if (obj.overlayType === 'observation') {
            this._observationList.appendChild(label);
        } else {
            this._baseLayersList.appendChild(label);
        }

        return label;
    },

    // Override the parent class and adds new overlayType data.
    _addLayer: function (layer, name, tabType) {
        layer.on('add remove', this._onLayerChange, this);

        var id = L.stamp(layer);

        this._layers[id] = {
            layer: layer,
            name: name,
            overlay: !!tabType,
            empty: layer.options ? layer.options.empty : false
        };

        if (tabType === 'overlay') {
            var overlayType;
            if (layer.options.vector) {
                overlayType = 'vector';
            } else if (layer.options.raster) {
                overlayType = 'raster';
            } else if (layer.options.stream) {
                overlayType = 'stream';
            }

            this._layers[id].overlayType = overlayType;

        } else if (tabType === 'observation') {
             this._layers[id].overlayType = tabType;
        }

        if (this.options.autoZIndex && layer.setZIndex) {
            this._lastZIndex++;
            layer.setZIndex(this._lastZIndex);
        }
    },

    // No op in case this function gets called by a Leaflet internal.
    // Because our control consist of two separate containers, we
    // create the containers in a different way than using this method.
    _createContainer: function() {

    },

    // Copied verbatim from
    // https://github.com/Leaflet/Leaflet/blob/master/src/control/Control.Layers.js
    // except for the two if clauses to (respectively) remove and add
    // the opacity slider.
    _onInputClick: function () {
        var inputs = this._form.getElementsByTagName('input'),
            input, layer, hasLayer,
            addedLayers = [],
            removedLayers = [];

        this._handlingClick = true;

        for (var i = inputs.length - 1; i >= 0; i--) {
            input = inputs[i];
            layer = this._layers[input.layerId].layer;
            hasLayer = this._map.hasLayer(layer);

            if (input.checked && !hasLayer) {
                addedLayers.push(layer);
            } else if (!input.checked && hasLayer) {
                removedLayers.push(layer);
            }
        }

        // Bugfix issue 2318: Should remove all old layers before readding new ones
        for (i = 0; i < removedLayers.length; i++) {
            var removedLayer = removedLayers[i],
                removedSlider = removedLayer.slider;
            this._map.removeLayer(removedLayer);
            if (removedSlider) {
                this._map.removeControl(removedSlider);
            }
        }
        for (i = 0; i < addedLayers.length; i++) {
            var addedLayer = addedLayers[i],
                addedSlider = addedLayer.slider;
            this._map.addLayer(addedLayer);
            if (addedSlider) {
                this._map.addControl(addedSlider);
            }
        }

        this._handlingClick = false;

        this._refocusOnMap();
    }
});

var LayerControlButtonView = Marionette.ItemView.extend({
    template: layerControlButtonTmpl,

    ui: {
        controlToggle: '.leaflet-bar-part',
    },

    events: {
        'click @ui.controlToggle': 'toggle'
    },

    toggle: function() {
        $('.leaflet-control-layers').toggle();
    }
});


var LayerControlListView = Marionette.ItemView.extend({
    template: layerControlListTmpl,
    className: 'leaflet-control leaflet-control-layers',

    ui: {
        close: '.close'
    },

    events: {
        'click @ui.close': 'close',
    },

    close: function() {
        (this.$el).hide();
    }
});
