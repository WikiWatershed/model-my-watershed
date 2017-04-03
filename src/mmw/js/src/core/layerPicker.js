'use strict';

var $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    _ = require('underscore'),
    utils = require('./utils'),
    layerPickerTmpl = require('./templates/layerPicker.html'),
    layerPickerGroupTmpl = require('./templates/layerPickerGroup.html'),
    layerPickerLayerTmpl = require('./templates/layerPickerLayer.html'),
    layerPickerLegendTmpl = require('./templates/layerPickerLegend.html'),
    layerPickerNavTmpl = require('./templates/layerPickerNav.html'),
    opacityControlTmpl = require('./templates/opacityControl.html');

var LayerOpacitySliderView = Marionette.ItemView.extend({
    template: opacityControlTmpl,

    events: {
       'mousedown input': 'onMouseDown',
       'mouseup input': 'onMouseUp',
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
        this.layer = options.layer;
    },

    onMouseDown: function() {
        this.leafletMap.dragging.disable();
    },

    onMouseUp: function(e) {
        this.leafletMap.dragging.enable();
        var el = $(e.target),
        sliderValue = el.val();
        this.layer.get('leafletLayer').setOpacity(sliderValue / 100);
        el.attr('value', sliderValue);
    },

    templateHelpers: function() {
        return {
            sliderValue: this.layer.get('leafletLayer').options.opacity * 100,
        };
    }
});

var LayerPickerLegendView = Marionette.ItemView.extend({
    template: layerPickerLegendTmpl,

    templateHelpers: function() {
        return {
            legendMapping: this.model.get('legendMapping'),
            colorClass: this.model.get('cssClassPrefix')
        };
    }
});

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
            viewport: {
                'selector': '.map-container',
                'padding': 10
            },
            content: new LayerPickerLegendView({
                model: this.model,
            }).render().el
        });
    },
});

/* The list of layers in a layer group */
var LayerPickerLayerListView = Marionette.CollectionView.extend({
    childView: LayerPickerLayerView,
    modelEvents: {
        'change': 'renderIfNotDestroyed'
    },
    collectionEvents: {
        'change': 'renderIfNotDestroyed',
    },

    // Use this gaurd because model updates after fetch
    // in the observations tab's LayerPickerGroupView
    // cause a parent re-render, and destroy this view.
    // This view is, however, listening to changes on the same model, so
    // `render` is called after it's been destroyed, and there's a
    // Marionette `ViewDestroyedError`
    renderIfNotDestroyed: function() {
        if(!this.isDestroyed){
            this.render();
        }
    },

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

    toggleLayer: function(selectedLayer) {
        utils.toggleLayer(selectedLayer, this.leafletMap, this.model);
        this.triggerMethod('select:layer');
    },
});

/* The layer picker group view. Renders the layer group's title and a collection view
    with its layers. */
var LayerPickerGroupView = Marionette.LayoutView.extend({
    template: layerPickerGroupTmpl,

    regions: {
        layers: '#layerpicker-layers',
        opacityControl: '#layerpicker-opacity-control',
    },

    modelEvents: {
        'change': 'render',
        'toggle:layer': 'addOpacityControl',
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
    },

    onRender: function() {
        if (this.model.get('name') === 'Observations' && !this.model.get('layers')) {
            this.model.fetchLayers(this.leafletMap);
        } else {
            this.showChildView('layers', new LayerPickerLayerListView({
                collection: this.model.get('layers'),
                model: this.model,
                leafletMap: this.leafletMap,
            }));
            this.addOpacityControl();
        }
    },

    addOpacityControl: function() {
        var currentActiveOpacityLayer = this.model.get('layers').findWhere({
            active: true,
            hasOpacitySlider: true,
        });
        if (currentActiveOpacityLayer) {
            this.showChildView('opacityControl', new LayerOpacitySliderView({
                leafletMap: this.leafletMap,
                layer: currentActiveOpacityLayer,
            }));
        } else {
            this.opacityControl.empty();
        }
    },

    templateHelpers: function() {
        var message = null;
        if (this.model.get('error')) {
            message = this.model.get('error');
        } else if (this.model.get('polling')) {
            message = 'Loading...';
        }
        return {
            layerGroupName: this.model.get('name'),
            message: message,
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

var LayerPickerNavView = Marionette.ItemView.extend({
    template: layerPickerNavTmpl,

    ui: {
        tabIcons: '[data-layer-tab]',
    },

    collectionEvents: {
        'toggle:layer': 'render'
    },


    events: {
        'click @ui.tabIcons': 'onTabIconClicked',
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
                    })),
                    activeClass = showTabAsActive ? 'active ' : '',
                    openClass = layerTab.active ? 'open ' : '';
                layerTab.navButtonClass = 'layerpicker-navbutton ' +  openClass + activeClass;
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

/**
The main layerpicker view
Expects options = {
    leafletMap, // required
    defaultActiveTabIndex, // optional, an index of the layer group tab
                             // that should start as active. Defaults to
                             // the first tab.
}
**/
var LayerPickerView = Marionette.LayoutView.extend({
    template: layerPickerTmpl,

    regions: {
        layerTab: '#layerpicker-tab',
        layerTabNav: '.layerpicker-nav',
    },

    collectionEvents: {
        'change': 'render',
    },

    initialize: function (options) {
        var layerToMakeActive = this.collection.models[options.defaultActiveTabIndex] ||
            this.collection.models[0];
        layerToMakeActive.set('active', true);

        this.leafletMap = options.leafletMap;
    },

    onRender: function() {
        this.layerTabNav.show(new LayerPickerNavView({
            collection: this.collection,
        }));

        var activeLayerTab = this.collection.findWhere({ active: true }),
            activeLayerGroups = activeLayerTab ? activeLayerTab.get('layerGroups') : null;
        if (activeLayerGroups) {
            this.layerTab.show(new LayerPickerTabView({
                collection: activeLayerGroups,
                leafletMap: this.leafletMap,
            }));
        }
    },

});

module.exports = LayerPickerView;
