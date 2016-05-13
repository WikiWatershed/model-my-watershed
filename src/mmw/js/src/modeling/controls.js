"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    coreUtils = require('../core/utils'),
    models = require('./models'),
    modificationConfigUtils = require('./modificationConfigUtils'),
    precipitationTmpl = require('./templates/controls/precipitation.html'),
    manualEntryTmpl = require('./templates/controls/manualEntry.html'),
    thumbSelectTmpl = require('./templates/controls/thumbSelect.html'),
    modDropdownTmpl = require('./templates/controls/modDropdown.html');

// Simulation input controls base class.
var ControlView = Marionette.LayoutView.extend({
    model: models.ModelPackageControlModel,

    className: function() {
        return 'inline ' + this.getControlName();
    },

    initialize: function(options) {
        this.mergeOptions(options, [
            'controlModel',
            'addModification',
            'addOrReplaceInput'
        ]);
    },

    getControlName: function() {
        throw 'Not implemented';
    }
});

var ThumbSelectView = Marionette.ItemView.extend({
    template: thumbSelectTmpl,

    initialize: function(options) {
        this.model.set('activeMod', null);
        this.addModification = options.addModification;
    },

    ui: {
        thumb: '.thumb',
        drawControl: '[data-value]'
    },

    events: {
        'click @ui.drawControl': 'onThumbClick',
        'mouseenter @ui.thumb': 'onThumbHover'
    },

    modelEvents: {
        'change:activeMod': 'render'
    },

    onThumbHover: function(e) {
        var value = $(e.currentTarget).data('value');
        this.model.set('activeMod', value);
    },

    onThumbClick: function(e) {
        var $el = $(e.currentTarget),
            controlName = this.model.get('controlName'),
            controlValue = $el.data('value');

        if (this.model.get('manualMode')) {
            this.startManual(controlName, controlValue);
        } else {
            this.startDrawing(controlName, controlValue);
        }
    },

    startDrawing: function(controlName, controlValue) {
        var self = this,
            map = App.getLeafletMap(),
            drawOpts = modificationConfigUtils.getDrawOpts(controlValue);

        this.model.set('dropdownOpen', false);
        drawUtils.drawPolygon(map, drawOpts).then(function(geojson) {
            self.addModification(new models.ModificationModel({
                name: controlName,
                value: controlValue,
                shape: geojson
            }));
        });
    },

    startManual: function(controlName, controlValue) {
        this.model.set('manualMod', controlValue);
    }
});

var ManualEntryView = Marionette.ItemView.extend({
    template: manualEntryTmpl,

    ui: {
        'backButton': '.back-button',
        'convertButton': '.convert-button'
    },

    events: {
        'click @ui.backButton': 'clearManualMod',
        'click @ui.convertButton': 'convert'
    },

    clearManualMod: function() {
        this.model.set('manualMod', null);
    },

    convert: function() {
        // TODO add modification
        this.model.set('dropdownOpen', false);
        this.clearManualMod();
    }
});

var ModificationsView = ControlView.extend({
    template: modDropdownTmpl,

    initialize: function(options) {
        ControlView.prototype.initialize.apply(this, [options]);
        var self = this;

        // If clicked outside this view and dropdown is open, then close it.
        $(document).mouseup(function(e) {
            var isTargetOutsideDropdown = $(e.target).parents('.dropdown-menu').length === 0;

            if (isTargetOutsideDropdown && self.model.get('dropdownOpen')) {
                self.model.set('dropdownOpen', false);
            }
        });
    },

    ui: {
        dropdownButton: '.dropdown-button'
    },

    events: {
        'click @ui.dropdownButton': 'onClickDropdownButton'
    },

    modelEvents: {
        'change:dropdownOpen': 'render',
        'change:manualMod': 'updateContent'
    },

    regions: {
        modContentRegion: '.mod-content-region'
    },

    onClickDropdownButton: function() {
        if (!this.model.get('dropdownOpen')) {
            this.model.set('dropdownOpen', true);
        }
    },

    onRender: function() {
        this.updateContent();
    },

    updateContent: function() {
        if (this.model.get('manualMod')) {
            this.modContentRegion.show(new ManualEntryView({model: this.model}));
        } else {
            this.modContentRegion.show(new ThumbSelectView({
                addModification: this.addModification,
                model: this.model
            }));
        }
    }
});

var LandCoverView = ModificationsView.extend({
    initialize: function(options) {
        ModificationsView.prototype.initialize.apply(this, [options]);
        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Land Cover',
            modRows: [
                ['open_water', 'developed_open', 'developed_low', 'developed_med'],
                ['developed_high', 'barren_land', 'deciduous_forest', 'shrub'],
                ['grassland', 'pasture', 'cultivated_crops', 'woody_wetlands']
            ]
        });
    },

    getControlName: function() {
        return 'landcover';
    }
});

var ConservationPracticeView = ModificationsView.extend({
    initialize: function(options) {
        ModificationsView.prototype.initialize.apply(this, [options]);
        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Conservation Practice',
            modRows: [
                ['rain_garden', 'infiltration_trench', 'porous_paving'],
                ['green_roof', 'no_till', 'cluster_housing']
            ]
        });
    },

    getControlName: function() {
        return 'conservation_practice';
    }
});

var GwlfeConservationPracticeView = ModificationsView.extend({
    initialize: function(options) {
        ModificationsView.prototype.initialize.apply(this, [options]);
        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Conservation Practice',
            manualMode: true,
            manualMod: null,
            modRows: [
                ['cover_crops', 'conservation_tillage', 'nutrient_management'],
                ['waste_management', 'buffer_strips', 'streambank_fencing'],
                ['streambank_stabilization', 'water_retention', 'infiltration']
            ]
        });
    },

    getControlName: function() {
        return 'gwlfe_conservation_practice';
    }
});

var PrecipitationSynchronizer = (function() {
    var isEnabled = false,
        precipViews = [];

    // Add a view to the list of views to be kept syncrhonized
    function add(precipView) {
        if (isEnabled) {
            precipViews.push(precipView);
        }
    }

    // Remove a view from the list
    function remove(precipView) {
        if (isEnabled) {
            precipViews = _.without(precipViews, precipView);
        }
    }

    // Turn synchronization on
    function on() {
        precipViews = [];
        isEnabled = true;
    }

    // Turn synchronization off
    function off() {
        isEnabled = false;
        precipViews = [];
    }

    // Synchronize the group to the given slider
    function syncTo(precipView) {
        if (isEnabled) {
            var value = precipView.ui.slider.val();

            isEnabled = false;

            precipViews.forEach(function(otherPrecipView) {
                var otherValue = otherPrecipView.ui.slider.val();
                if (otherValue !== value) {
                    otherPrecipView.ui.slider.val(value);
                    otherPrecipView.onSliderChanged();
                }
            });

            isEnabled = true;
        }
    }

    // Synchronize the group to the first slider
    function sync() {
        if (precipViews.length > 0) {
            syncTo(precipViews[0]);
        }
    }

    return {
        add: add,
        remove: remove,
        on: on,
        off: off,
        sync: sync,
        syncTo: syncTo
    };
})();

var PrecipitationView = ControlView.extend({
    template: precipitationTmpl,

    ui: {
        slider: 'input',
        displayValue: '.value'
    },

    events: {
        'input @ui.slider': 'onSliderDragged',
        'change @ui.slider': 'onSliderChanged'
    },

    getControlName: function() {
        return 'precipitation';
    },

    getDisplayValue: function(value) {
        return value.toFixed(2) + ' cm';
    },

    onSliderDragged: function() {
        // Preview slider value while dragging.
        var value = parseFloat(this.ui.slider.val());

        this.ui.slider.attr('value', value);
        this.ui.displayValue.text(this.getDisplayValue(value));
    },

    onSliderChanged: function() {
        var value = parseFloat(this.ui.slider.val()),
            // Model expects Imperial inputs.
            imperialValue = coreUtils.convertToImperial(value, 'cm'),
            modification = new models.ModificationModel({
                name: this.getControlName(),
                value: imperialValue
            });

        // Update values for IE which doesn't trigger onSliderDragged. Will
        // effectively noop on other browsers, since the same values were
        // already set by onSliderDragged.
        this.ui.slider.attr('value', value);
        this.ui.displayValue.text(this.getDisplayValue(value));

        PrecipitationSynchronizer.syncTo(this);

        this.addOrReplaceInput(modification);
    },

    onAttach: function() {
        PrecipitationSynchronizer.add(this);
    },

    onBeforeDestroy: function() {
        PrecipitationSynchronizer.remove(this);
    },

    onRender: function() {
        var model = this.controlModel,
            value = model && model.get('value') || 0;

        // Model values are stored in Imperial and need to be displayed as
        // metric.
        value = coreUtils.convertToMetric(value, 'in');
        this.ui.slider.val(value);
        this.ui.slider.attr('value', value);
        this.ui.displayValue.text(this.getDisplayValue(value));
    }
});

function getControlView(controlName) {
    switch (controlName) {
        case 'landcover':
            return LandCoverView;
        case 'conservation_practice':
            return ConservationPracticeView;
        case 'gwlfe_conservation_practice':
            return GwlfeConservationPracticeView;
        case 'precipitation':
            return PrecipitationView;
    }
    throw 'Control not implemented: ' +  controlName;
}

module.exports = {
    LandCoverView: LandCoverView,
    ConservationPracticeView: ConservationPracticeView,
    GwlfeConservationPracticeView: GwlfeConservationPracticeView,
    PrecipitationView: PrecipitationView,
    getControlView: getControlView,
    PrecipitationSynchronizer: PrecipitationSynchronizer
};
