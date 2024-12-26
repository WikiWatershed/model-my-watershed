'use strict';

var $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    moment = require('moment'),
    _ = require('underscore'),
    utils = require('./utils'),
    layerPickerTmpl = require('./templates/layerPicker.html'),
    layerPickerGroupTmpl = require('./templates/layerPickerGroup.html'),
    layerPickerLayerTmpl = require('./templates/layerPickerLayer.html'),
    layerPickerLegendTmpl = require('./templates/layerPickerLegend.html'),
    layerPickerColorRampLegendTmpl = require('./templates/layerPickerColorRampLegendTmpl.html'),
    layerPickerNavTmpl = require('./templates/layerPickerNav.html'),
    opacityControlTmpl = require('./templates/opacityControl.html'),
    timeSliderTmpl = require('./templates/timeSliderControl.html');


var LayerTimeSliderView = Marionette.LayoutView.extend({
    template: timeSliderTmpl,

    ui: {
        slider: 'input',
        monthLabel: '.time-slider-month',
    },

    events: {
        'mousedown @ui.slider': 'onMouseDown',
        'mouseup @ui.slider': 'onMouseUp',
        'input @ui.slider': 'sliderMove',
        'change @ui.slider': 'sliderMove', // IE only event
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
        this.layer = options.layer;

    },

    sliderMove: function(e) {
        var sliderValue = $(e.target).val(),
            month = moment(Number(sliderValue) + 1, 'M').format('MMM');

        this.ui.monthLabel.text(month);
    },

    onMouseDown: function() {
        this.leafletMap.dragging.disable();
    },

    onMouseUp: function(e) {
        this.leafletMap.dragging.enable();
        var el = $(e.target),
        sliderValue = el.val();

        this.model.set('selectedTimeLayerIdx', Number(sliderValue));
    },

    templateHelpers: function() {
        var idx = this.model.get('selectedTimeLayerIdx') + 1,
            month = moment(idx, 'M').format('MMM');

        return {
            min: 0,
            max: this.layer.get('timeLayers').length - 1,
            month: month,
            shortDisplay: this.layer.get('shortDisplay'),
        };
    }
});

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
            sliderValue = el.val(),
            leafletLayer = this.layer.get('leafletLayer'),
            hasOverLayers = this.layer.get('hasOverLayers'),
            overLayers = this.layer.get('overLayers');

        leafletLayer.setOpacity(sliderValue / 100);
        if (hasOverLayers) {
            overLayers.invoke('setOpacity', sliderValue / 100);
        }

        el.attr('value', sliderValue);
        this.model.set('selectedOpacityValue', Number(sliderValue));
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

var LayerPickerColorRampLegendView = Marionette.ItemView.extend({
    template: layerPickerColorRampLegendTmpl,

    templateHelpers: function() {
        return {
            colorRampId: this.model.get('colorRampId'),
            legendUnitsLabel: this.model.get('legendUnitsLabel'),
            legendUnitBreaks: this.model.get('legendUnitBreaks'),
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
            useColorRamp: this.model.get('useColorRamp')
        };
    },

    onRender: function() {
        var legendTooltipContent = this.model.get('useColorRamp') ?
            new LayerPickerColorRampLegendView({ model: this.model }) :
            new LayerPickerLegendView({ model: this.model });

        this.ui.layerHelpIcon.popover({
            trigger: 'focus',
            viewport: {
                'selector': '.map-container',
                'padding': 10
            },
            content: legendTooltipContent.render().el
        });
    }
});

/* The list of layers in a layer group */
var LayerPickerLayerListView = Marionette.CollectionView.extend({
    childView: LayerPickerLayerView,
    modelEvents: {
        'change': 'renderIfNotDestroyed',
        'change:selectedTimeLayerIdx': 'updateTimePeriod',
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
    },

    toggleLayer: function(selectedLayer) {
        utils.toggleLayer(selectedLayer, this.leafletMap, this.model);
        this.triggerMethod('select:layer');
    },

    updateTimePeriod: function() {
        var layer = this.collection.findWhere({'active': true});
        utils.toggleTimeLayer(layer, this.leafletMap, this.model);
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

    ui: {
        messageArea: '.layerpicker-message',
    },

    modelEvents: {
        'change': 'onShow',
        'toggle:layer': 'addLayerControls',
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
        this.timeSliderRegion = options.timeSliderRegion;
    },

    onShow: function() {
        if (this.model.get('name') === 'Observations' && !this.model.get('layers')) {
            this.model.fetchLayersIfNeeded();
        } else {
            this.showChildView('layers', new LayerPickerLayerListView({
                collection: this.model.get('layers'),
                model: this.model,
                leafletMap: this.leafletMap,
            }));
            this.addLayerControls();
        }

        var message = null;
        if (this.model.get('error')) {
            message = this.model.get('error');
        } else if (this.model.get('polling')) {
            message = '<div class="layerpicker-loading">Loading...</div>';
        }

        this.ui.messageArea.html(message);
    },

    addLayerControls: function() {
        // Add opacity or time sliders if this newly selected layer has them enabled
        var activeLayer = this.model.get('layers').findWhere({
            active: true,
        });

        if (activeLayer) {
            this.addOpacityControl(activeLayer);
            this.addTimeSliderControl(activeLayer);
        } else {
            // Always remove the time slider control when there is no active layer
            this.hideTimeSliderRegion();
        }
    },

    addTimeSliderControl: function(layer) {
        if (layer.get('hasTimeSlider')) {
            var timeSlider = new LayerTimeSliderView({
                leafletMap: this.leafletMap,
                model: this.model,
                layer: layer,
            });

            this.showTimeSliderRegion(timeSlider);
        } else {
            this.hideTimeSliderRegion();
        }

    },

    addOpacityControl: function(layer) {
        if (layer.get('hasOpacitySlider')) {
            this.showChildView('opacityControl', new LayerOpacitySliderView({
                leafletMap: this.leafletMap,
                layer: layer,
                model: this.model,
            }));
        } else {
            this.opacityControl.empty();
        }
    },

    templateHelpers: function() {
        return {
            layerGroupName: this.model.get('name'),
        };
    },

    showTimeSliderRegion: function(timeSlider) {
        if (!this.timeSliderRegion) { return; }
        this.timeSliderRegion.show(timeSlider);
    },

    hideTimeSliderRegion: function() {
        if (!this.timeSliderRegion) { return; }
        this.timeSliderRegion.empty();
    }
});

var LayerPickerTabView = Marionette.CollectionView.extend({
    childView: LayerPickerGroupView,
    childViewOptions: function() {
        return {
            leafletMap: this.leafletMap,
            timeSliderRegion: this.timeSliderRegion,
        };
    },

    initialize: function(options) {
        this.leafletMap = options.leafletMap;
        this.timeSliderRegion = options.timeSliderRegion;
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
        var doesLayerGroupHaveActiveLayer = function(layerGroup) {
            var layers = layerGroup.get('layers');
            if (layers) {
                return layers.findWhere({ active : true });
            }
            return false;
        };

        return {
            layerTabs: _.forEach(this.collection.toJSON(), function(layerTab) {
                var isLayerPickerOpenAndTabActive = layerTab.active && this.isLayerPickerOpen,
                    showTabAsActive = isLayerPickerOpenAndTabActive ||
                        (layerTab.name !== "Basemaps" &&
                        layerTab.layerGroups.any(doesLayerGroupHaveActiveLayer)),
                    activeClass = showTabAsActive ? 'active ' : '',
                    openClass = isLayerPickerOpenAndTabActive ? 'open ' : '';
                layerTab.navButtonClass = 'layerpicker-navbutton ' +  openClass + activeClass;
            }, { isLayerPickerOpen: this.model.get('isOpen') })
        };
    },

    toggleActiveTab: function(newActiveTabName) {
        var currentActive = this.collection.findWhere({ active: true}),
            isLayerPickerOpen = this.model.get('isOpen'),
            isCurrentActiveNewActive = currentActive &&
                newActiveTabName === currentActive.get('name');

        if (!isLayerPickerOpen) {
            this.model.set('isOpen', true);
        } else if (isLayerPickerOpen && isCurrentActiveNewActive) {
            this.model.set('isOpen', false);
        }

        if (!isCurrentActiveNewActive) {
            currentActive.set('active', false);
        }

        this.collection.findWhere({ name: newActiveTabName }).set('active', true);
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
        tileSlider: '.ghostmouse',
    },

    ui: {
        headerIcon: '.layerpicker-header > i',
        header: '.layerpicker-header'
    },

    events: {
        'click @ui.header': 'onHeaderClicked',
    },

    collectionEvents: {
        'change': 'onShow',
    },

    modelEvents: {
        'change': 'onShow',
    },

    initialize: function (options) {
        var layerToMakeActive = this.collection.models[options.defaultActiveTabIndex] ||
            this.collection.models[0];
        layerToMakeActive.set('active', true);

        this.leafletMap = options.leafletMap;
        this.timeSliderRegion = options.timeSliderRegion;
        this.model = new Backbone.Model({
            isOpen: true,
        });
    },

    onShow: function() {
        var isOpen = this.model.get('isOpen');

        if (isOpen) {
            this.ui.headerIcon
                .addClass('fa-chevron-down')
                .removeClass('fa-chevron-up');
        } else {
            this.ui.headerIcon
                .addClass('fa-chevron-up')
                .removeClass('fa-chevron-down');
        }

        this.layerTabNav.show(new LayerPickerNavView({
            collection: this.collection,
            model: this.model,
        }));

        var activeLayerTab = this.collection.findWhere({ active: true }),
            activeLayerGroups = activeLayerTab ? activeLayerTab.get('layerGroups') : null;
        if (activeLayerGroups && isOpen) {
            this.layerTab.show(new LayerPickerTabView({
                collection: activeLayerGroups,
                leafletMap: this.leafletMap,
                timeSliderRegion: this.timeSliderRegion,
            }));
        } else {
            this.layerTab.empty();
        }
    },

    onHeaderClicked: function() {
        this.model.set('isOpen', !this.model.get('isOpen'));
    }

});

module.exports = LayerPickerView;
