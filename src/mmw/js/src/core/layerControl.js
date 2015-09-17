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

    // Overrides the parent class and allows separation of overlay layers
    // by type.
    _addItem: function (obj) {
        var label = document.createElement('label'),
            checked = this._map.hasLayer(obj.layer),
            input,
            controlName = 'leaflet-overlay-layers';

        if (obj.overlay && !obj.overlayType) {
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

        var container = obj.overlay ? this._overlaysList : this._baseLayersList;
        var subcontainer;
        if (obj.overlayType) {
             subcontainer = document.getElementById('overlay-subclass-' + obj.overlayType);
             if (subcontainer === null) {
                 subcontainer = document.createElement('div');
                 subcontainer.id = 'overlay-subclass-' + obj.overlayType;
                 container.appendChild(subcontainer);

                 var title = obj.overlayType === 'vector' ? 'Boundary' : 'Coverage';
                 var textNode = document.createElement('h4');
                 textNode.innerHTML = title;
                 subcontainer.appendChild(textNode);
             }
             subcontainer.appendChild(label);
        } else {
            container.appendChild(label);
        }

        return label;
    },

    // Override the parent class and adds new overlayType data.
    _addLayer: function (layer, name, overlay) {
        layer.on('add remove', this._onLayerChange, this);

        var id = L.stamp(layer);

        this._layers[id] = {
            layer: layer,
            name: name,
            overlay: overlay,
            empty: layer.options.empty
        };

        if (overlay) {
             this._layers[id].overlayType = layer.options.vector ? 'vector' : 'raster';
        }

        if (this.options.autoZIndex && layer.setZIndex) {
            this._lastZIndex++;
            layer.setZIndex(this._lastZIndex);
        }
    },

    _createContainer: function() {
        var container = new LayerControlView({}).render().el;

        return container;
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
