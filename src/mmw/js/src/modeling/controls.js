"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
    models = require('./models'),
    modificationConfigUtils = require('./modificationConfigUtils'),
    gwlfeConfig = require('./gwlfeModificationConfig'),
    entryViews = require('./gwlfe/entry/views'),
    precipitationTmpl = require('./templates/controls/precipitation.html'),
    manualEntryTmpl = require('./templates/controls/manualEntry.html'),
    userInputTmpl = require('./templates/controls/userInput.html'),
    inputInfoTmpl = require('./templates/controls/inputInfo.html'),
    thumbSelectTmpl = require('./templates/controls/thumbSelect.html'),
    settingsTmpl = require('./templates/controls/settings.html'),
    greenButtonTmpl = require('./templates/controls/greenButton.html'),
    modDropdownTmpl = require('./templates/controls/modDropdown.html');

var ENTER_KEYCODE = 13;

// Simulation input controls base class.
var ControlView = Marionette.LayoutView.extend({
    model: models.ModelPackageControlModel,

    className: function() {
        return 'inline control-item ' + this.getControlName();
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
        var modKeys = _.flatten(_.pluck(this.model.get('modRowGroups'), 'rows'), true),
            dataModel = this.model.get('dataModel'),
            manualMode = this.model.get('manualMode'),
            modEnabled = {};

        _.forEach(modKeys, function(modKey) {
            modEnabled[modKey] = manualMode ? gwlfeConfig.configs[modKey].validateDataModel(dataModel) : true;
        });

        this.model.set({
            activeMod: null,
            modEnabled: modEnabled
        });
        this.addModification = options.addModification;
    },

    ui: {
        thumb: '.thumb',
        drawControl: '[data-value]'
    },

    events: {
        'click @ui.drawControl': 'onThumbClick',
        'touchstart @ui.thumb': 'onThumbClick',
        'mouseenter @ui.thumb': 'onThumbHover'
    },

    modelEvents: {
        'change:activeMod': 'render'
    },

    onThumbHover: function(e) {
        var modKey = $(e.currentTarget).data('value');
        this.model.set('activeMod', modKey);
    },

    onThumbClick: function(e) {
        var $el = $(e.currentTarget),
            controlName = this.model.get('controlName'),
            controlValue = $el.data('value');

        if (this.model.get('modEnabled')[controlValue]) {
            if (this.model.get('manualMode')) {
                this.startManual(controlName, controlValue);
            } else {
                this.startDrawing(controlName, controlValue);
            }
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

var InputInfoView = Marionette.ItemView.extend({
    template: inputInfoTmpl,

    initialize: function(options) {
        this.userInputName = options.userInputName;
    },

    modelEvents: {
        'change:output': 'render'
    },

    templateHelpers: function() {
        var output = this.model.get('output'),
            errorMessage = output && output.errorMessages[this.userInputName],
            infoMessage = output && output.infoMessages[this.userInputName],
            isError = false,
            message;

        if (errorMessage) {
            isError = true;
            message = errorMessage;
        } else if (infoMessage) {
            message = infoMessage;
        }

        return {
            message: message,
            isError: isError
        };
    }
});

var UserInputView = Marionette.LayoutView.extend({
    template: userInputTmpl,

    initialize: function(options) {
        this.parentModel = options.parentModel;
    },

    regions: {
        infoRegion: '.info-region'
    },

    onShow: function() {
        this.infoRegion.show(new InputInfoView({
            model: this.parentModel,
            userInputName: this.model.get('userInputName')
        }));
    },

    templateHelpers: function() {
        return {
            displayNames: gwlfeConfig.displayNames
        };
    }
});

var ManualEntryView = Marionette.CompositeView.extend({
    template: manualEntryTmpl,

    ui: {
        'backButton': '.back-button',
        'applyButton': '.apply-button'
    },

    events: {
        'click @ui.backButton': 'clearManualMod',
        'click @ui.applyButton': 'applyModification',
        'keyup': 'onKeyUp'
    },

    childView: UserInputView,

    childViewContainer: '#user-input-region',

    initialize: function(options) {
        this.addModification = options.addModification;
    },

    childViewOptions: function() {
        return {
            parentModel: this.model
        };
    },

    templateHelpers: function() {
        var manualMod = this.model.get('manualMod');
        return {
            modConfig: gwlfeConfig.configs[manualMod],
            displayNames: gwlfeConfig.displayNames,
            dataModel: this.model.get('dataModel')
        };
    },

    onKeyUp: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.applyModification();
        }
    },

    onShow: function() {
        var self = this,
            $input = $(this.el).find('input');

        $input.on('change keyup paste', function() {
            self.computeOutput();
        });

        $input[0].focus();
    },

    clearManualMod: function() {
        this.model.set({
            manualMod: null,
            output: null
        });
    },

    closeDropdown: function() {
        this.model.set('dropdownOpen', false);
    },

    computeOutput: function() {
        var modConfig = gwlfeConfig.configs[this.model.get('manualMod')],
            userInput = _.map(modConfig.userInputNames, function(userInputName) {
                return $('#'+userInputName).val();
            }),
            output;

        userInput = _.zipObject(modConfig.userInputNames, userInput);
        output = gwlfeConfig.aggregateOutput(this.model.get('dataModel'),
            userInput, modConfig.validate, modConfig.computeOutput);

        this.model.set({
            output: output,
            userInput: userInput
        });
    },

    applyModification: function() {
        this.computeOutput();
        var modKey = this.model.get('manualMod'),
            userInput = this.model.get('userInput'),
            output = this.model.get('output');

        if (output && gwlfeConfig.isValid(output.errorMessages)) {
            this.clearManualMod();
            this.closeDropdown();

            this.addModification(new models.GwlfeModificationModel({
                modKey: modKey,
                userInput: userInput,
                output: output.output
            }));
        }
    }
});

var ModificationsView = ControlView.extend({
    template: modDropdownTmpl,

    initialize: function(options) {
        ControlView.prototype.initialize.apply(this, [options]);
        var self = this;

        function closeDropdownOnOutsideClick(e) {
            var isTargetOutsideDropdown = $(e.target).parents('.dropdown-menu').length === 0;
            if (isTargetOutsideDropdown && self.model.get('dropdownOpen')) {
                self.model.set('dropdownOpen', false);
            }
        }

        /*
            If not in manualMode, and there was a click outside this view, and dropdown is
            open, then close the dropdown. We don't do this in  manualMode because
            highlighting the value in the input by clicking and then dragging outside the
            dropdown closes the dropdown, and this is not correct. A more sophisticated
            solution is possible, but this is a quickfix for the moment.
        */
        $(document).on('mouseup', function(e) {
            if (!self.model.get('manualMode')) {
                closeDropdownOnOutsideClick(e);
            }
        });
    },

    ui: {
        dropdown: '.modification-dropdown',
        dropdownButton: '.dropdown-button'
    },

    events: {
        'click @ui.dropdownButton': 'onClickDropdownButton'
    },

    modelEvents: {
        'change:dropdownOpen': 'toggleDropdown',
        'change:manualMod': 'updateContent'
    },

    regions: {
        modContentRegion: '.mod-content-region'
    },

    toggleDropdown: function(model, dropdownOpen) {
        if (dropdownOpen) {
            this.ui.dropdown.addClass('open');
        } else {
            this.ui.dropdown.removeClass('open');
            this.model.set({
                manualMod: null,
                output: null
            });
        }
    },

    onClickDropdownButton: function() {
        var dropdownOpen = this.model.get('dropdownOpen');

        // Toggle dropdown if in manual mode, else just open it
        if (this.model.get('manualMode') || !dropdownOpen) {
            this.model.set('dropdownOpen', !dropdownOpen);
        }
    },

    onRender: function() {
        this.updateContent();
    },

    updateContent: function() {
        var manualMod = this.model.get('manualMod');
        if (manualMod) {
            var modConfig = gwlfeConfig.configs[manualMod],
                userInputNames = _.map(modConfig.userInputNames, function(name) {
                    return { userInputName: name };
                }),
                userInputCollection = new Backbone.Collection(userInputNames);

            this.modContentRegion.show(new ManualEntryView({
                model: this.model,
                collection: userInputCollection,
                addModification: this.addModification
            }));
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
            modRowGroups: [{
                name: '',
                rows: [
                    ['open_water', 'developed_open', 'developed_low', 'developed_med'],
                    ['developed_high', 'barren_land', 'deciduous_forest', 'shrub'],
                    ['grassland', 'pasture', 'cultivated_crops', 'woody_wetlands']
                ]
            }]
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
            modRowGroups: [{
                name: '',
                rows: [
                    ['rain_garden', 'infiltration_basin', 'porous_paving'],
                    ['green_roof', 'no_till', 'cluster_housing']
                ]
            }]
        });
    },

    getControlName: function() {
        return 'conservation_practice';
    }
});

var GwlfeLandCoverView = ControlView.extend({
    template: greenButtonTmpl,

    events: {
        'click button': 'showLandCoverModal',
    },

    getControlName: function() {
        return 'gwlfe_landcover';
    },

    initialize: function(options) {
        ControlView.prototype.initialize.apply(this, [options]);

        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Land Cover',
            dataModel: gwlfeConfig.cleanDataModel(App.currentProject.get('gis_data')),
            errorMessages: null,
            infoMessages: null,
        });
    },

    showLandCoverModal: function() {
        var currentScenario = App.currentProject.get('scenarios')
                                 .findWhere({ active: true });

        entryViews.showLandCoverModal(
            this.model.get('dataModel'),
            currentScenario.get('modifications'),
            this.addModification
        );
    },
});

var GwlfeConservationPracticeView = ModificationsView.extend({
    initialize: function(options) {
        ModificationsView.prototype.initialize.apply(this, [options]);
        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Conservation Practice',
            manualMode: true,
            manualMod: null,
            modRowGroups: [
                {
                    name: 'Rural',
                    rows: [
                        ['cover_crops', 'crop_tillage_no', 'conservation_tillage', 'crop_tillage_reduced', 'nutrient_management'],
                        ['waste_management_livestock', 'waste_management_poultry', 'buffer_strips', 'streambank_fencing', 'streambank_stabilization']
                    ]
                },
                {
                    name: 'Urban',
                    rows: [['urban_buffer_strips', 'urban_streambank_stabilization', 'water_retention', 'infiltration']]
                }
            ],
            dataModel: gwlfeConfig.cleanDataModel(App.currentProject.get('gis_data')),
            errorMessages: null,
            infoMessages: null
        });
    },

    getControlName: function() {
        return 'gwlfe_conservation_practice';
    }
});

var GwlfeSettingsView = ControlView.extend({
    template: settingsTmpl,

    events: {
        'click button': 'showSettingsModal',
    },

    getControlName: function() {
        return 'gwlfe_settings';
    },

    initialize: function(options) {
        ControlView.prototype.initialize.apply(this, [options]);

        this.model.set({
            controlName: this.getControlName(),
            controlDisplayName: 'Settings',
            dataModel: gwlfeConfig.cleanDataModel(App.currentProject.get('gis_data')),
            errorMessages: null,
            infoMessages: null,
        });
    },

    showSettingsModal: function() {
        var currentScenario = App.currentProject.get('scenarios')
                                 .findWhere({ active: true });

        entryViews.showSettingsModal(
            this.model.get('controlDisplayName'),
            this.model.get('dataModel'),
            currentScenario.get('modifications'),
            this.addModification
        );
    },
});


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

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            sliderMax = scheme === coreUnits.UNIT_SCHEME.METRIC ?
                        25 : // 25 cm
                        10;  // 10 in

        return {
            sliderMax: sliderMax,
        };
    },

    getControlName: function() {
        return 'precipitation';
    },

    getDisplayValue: function(value) {
        var scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name;

        return value.toFixed(2) + ' ' + lengthUnit;
    },

    onSliderDragged: function() {
        // Preview slider value while dragging.
        var value = parseFloat(this.ui.slider.val());

        this.ui.slider.attr('value', value);
        this.ui.displayValue.text(this.getDisplayValue(value));
    },

    onSliderChanged: function() {
        var scheme = settings.get('unit_scheme'),
            sliderValue = parseFloat(this.ui.slider.val()),
            // Always store in inches
            value = scheme === coreUnits.UNIT_SCHEME.METRIC ?
                    sliderValue / coreUnits.CONVERSIONS.CM_PER_IN :
                    sliderValue,
            modification = new models.ModificationModel({
                name: this.getControlName(),
                value: value,
            });

        // Update values for IE which doesn't trigger onSliderDragged. Will
        // effectively noop on other browsers, since the same values were
        // already set by onSliderDragged.
        this.ui.slider.attr('value', value);
        this.ui.displayValue.text(this.getDisplayValue(value));

        this.addOrReplaceInput(modification);
    },

    onRender: function() {
        var scheme = settings.get('unit_scheme'),
            model = this.controlModel,
            value = model && model.get('value') || 0;

        // Convert from inches if necessary
        if (scheme === coreUnits.UNIT_SCHEME.METRIC) {
            value *= coreUnits.CONVERSIONS.CM_PER_IN;
        }

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
        case 'gwlfe_landcover':
            return GwlfeLandCoverView;
        case 'gwlfe_conservation_practice':
            return GwlfeConservationPracticeView;
        case 'gwlfe_settings':
            return GwlfeSettingsView;
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
};
