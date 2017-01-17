'use strict';

var models = require('./models'),
    L = require('leaflet'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('backbone'),
    _ = require('underscore'),
    utils = require('./utils'),
    layerPickerTmpl = require('./templates/layerPicker.html'),
    layerPickerGroupTmpl = require('./templates/layerPickerGroup.html'),
    layerPickerLayerTmpl = require('./templates/layerPickerLayer.html');

/* The individual layers in each layer group */
var LayerPickerLayerView = Marionette.ItemView.extend({
    template: layerPickerLayerTmpl,

    ui: {
        layerHelpIcon: '[data-layer-help-icon]',
    },

    modelEvents: {
        'change': 'render'
    },

    triggers: {
        'click button': 'select:layer',
    },

    templateHelpers: function() {
        return {
            layerDisplay: this.model.get('display'),
            layerClass: this.model.get('active') ? 'layerpicker-title active' : 'layerpicker-title',
            isDisabled: this.model.get('disabled'),
        };
    },

    onRender: function() {
        this.ui.layerHelpIcon.popover({
            trigger: 'hover',
            viewport: '.map-container'
        });
    },
});

/* The list of layers in a layer group */
var LayerPickerLayerListView = Marionette.CollectionView.extend({
    childView: LayerPickerLayerView,
    onChildviewSelectLayer: function(childView) {
        this.toggleLayer(childView.model);
    },
    initialize: function(options) {
        this.leafletMap = options.leafletMap;
        utils.zoomToggle(this.leafletMap, options.collection.toJSON(),
            _.bind(this.updateDisabled, this), _.bind(this.clearBgBufferOnLayer, this));
        utils.perimeterToggle(this.leafletMap, options.collection.toJSON(),
            _.bind(this.updateDisabled, this), _.bind(this.clearBgBufferOnLayer, this));
    },

    updateDisabled: function(layer, shouldDisable) {
        this.collection.findWhere({ display: layer.display })
            .set('disabled', shouldDisable);
    },

    clearBgBufferOnLayer: function(layer) {
        var leafletLayer = this.collection.findWhere({ display: layer.display})
            .get('leafletLayer');
        if (leafletLayer) {
            leafletLayer._clearBgBuffer();
        }
    },

    // If the google layer wasn't ready to set up when the model was initialized,
    // initialize it now.
    loadGoogleLayer: function(layer) {
        if (window.google) {
            layer.set('leafletLayer', new L.Google(layer.get('googleType'), {
                maxZoom: layer.get('maxZoom')
            }));
        }
    },

    toggleLayer: function(selectedLayer) {
        if (!selectedLayer.get('leafletLayer') && selectedLayer.get('googleType')) {
            this.loadGoogleLayer(selectedLayer);
        }
        var currentActiveLayers = this.collection.where({ active: true });
        var isInCurrentActive = _.includes(currentActiveLayers, selectedLayer);
        if (currentActiveLayers.length > 0) {
            // Works like a checkbox
            if (this.model.get('canSelectMultiple')) {
                if (isInCurrentActive) {
                    selectedLayer.set('active', false);
                    this.leafletMap.removeLayer(selectedLayer.get('leafletLayer'));
                } else {
                    selectedLayer.set('active', true);
                    this.leafletMap.addLayer(selectedLayer.get('leafletLayer'));
                }
            // Works like radio buttons
            } else {
                if (isInCurrentActive && !this.model.get('mustHaveActive')) {
                    selectedLayer.set('active', false);
                    this.leafletMap.removeLayer(selectedLayer.get('leafletLayer'));
                } else {
                    var currentActiveLayer = currentActiveLayers[0];
                    currentActiveLayer.set('active', false);
                    this.leafletMap.removeLayer(currentActiveLayer.get('leafletLayer'));
                    selectedLayer.set('active', true);
                    this.leafletMap.addLayer(selectedLayer.get('leafletLayer'));
                }
            }
        } else {
            selectedLayer.set('active', true);
            this.leafletMap.addLayer(selectedLayer.get('leafletLayer'));
        }
        if (this.model.get('name') === "Basemaps") {
            this.leafletMap.fireEvent('baselayerchange', selectedLayer.get('leafletLayer'));
        }
    },
});

/* The layer picker group view. Renders the layer group's title and a collection view
    with its layers. */
var LayerPickerGroupView = Marionette.LayoutView.extend({
    template: layerPickerGroupTmpl,
    regions: {
        layers: '#layerpicker-layers',
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
    },

    onRender: function() {
        this.showChildView('layers', new LayerPickerLayerListView({
          collection: this.model.get('layers'),
          model: this.model,
          leafletMap: this.leafletMap,
      }));
    },

    templateHelpers: function() {
        return {
            layerGroupName: this.model.get('name'),
        };
    }
});

var LayerPickerTabView = Marionette.CollectionView.extend({
    childView: LayerPickerGroupView,
    childViewOptions: function() {
        return {
            leafletMap: this.leafletMap,
        };
    },
    initialize: function(options) {
        this.leafletMap = options.leafletMap;
    }
});

var LayerPickerView = Marionette.LayoutView.extend({
    template: layerPickerTmpl,

    regions: {
        layerTab: '#layerpicker-tab',
    },

    ui: {
        tabIcons: '[data-layer-tab]',
    },

    events: {
        'click @ui.tabIcons': 'onTabIconClicked',
    },

    collectionEvents: {
        'change': 'render'
    },

    initialize: function (options) {
        this.collection = new Backbone.Collection([
            {   name: 'Basemaps',
                active: true,
                layerGroups: new Backbone.Collection([
                    new models.LayerGroupModel({
                        name: 'Basemaps',
                        mustHaveActive: true,
                        layers: this.model.baseLayers,
                    }),
                ])
            },
            {   name: 'Streams',
                layerGroups: new Backbone.Collection([
                    new models.LayerGroupModel({
                        name: 'Streams',
                        layers: this.model.streamLayers,
                    }),
                ]),
            },
            {   name: 'Coverage Grid',
                layerGroups: new Backbone.Collection([
                    new models.LayerGroupModel({
                        name: 'Coverage Grid',
                        layers: this.model.coverageLayers,
                    }),
                ])
            },
            {   name: 'Boundary',
                layerGroups: new Backbone.Collection([
                    new models.LayerGroupModel({
                        name: 'Boundary',
                        layers:this.model.boundaryLayers,
                    }),
                ])
            },
            {   name: 'Observations',
                layerGroups: new Backbone.Collection([
                    new models.LayerGroupModel({
                        name: 'Observations',
                        canSelectMultiple: true,
                        layersDeferred: this.model.observationsDeferred,
                    }),
                ])
            },
        ]);
        this.leafletMap = options.leafletMap;
    },

    onRender: function() {
        var activeLayerTab = this.collection.findWhere({ active: true}),
            activeLayerGroups = activeLayerTab ? activeLayerTab.get('layerGroups') : null;
        if (activeLayerGroups) {
            this.layerTab.show(new LayerPickerTabView({
                collection: activeLayerGroups,
                leafletMap: this.leafletMap,
            }));
        }
    },

    templateHelpers: function() {
        return {
            layerTabs: _.forEach(this.collection.toJSON(), function(layerTab) {
                var showTabAsActive = layerTab.active || (layerTab.name !== "Basemaps" &&
                    layerTab.layerGroups.any(function(layerGroup) {
                        var layers = layerGroup.get('layers');
                        if (layers) {
                            return layers.findWhere({ active : true });
                        }
                    }));
                layerTab.navButtonClass = showTabAsActive ?
                    'layerpicker-navbutton active' : 'layerpicker-navbutton';
            })
        };
    },

    toggleActiveTab: function(newActiveTabName) {
        var currentActive = this.collection.findWhere({ active: true});
        if (currentActive) {
            currentActive.set('active', false);
        }
        if (!currentActive || currentActive.get('name') !== newActiveTabName) {
            this.collection.findWhere({ name: newActiveTabName }).set('active', true);
        }
    },

    onTabIconClicked: function(e) {
        var $el = $(e.currentTarget),
            tabName = $el.data('layer-tab');
        this.toggleActiveTab(tabName);
        e.preventDefault();
    },
});

module.exports = LayerPickerView;
