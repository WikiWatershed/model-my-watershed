"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    models = require('./models'),
    modificationConfigUtils = require('./modificationConfigUtils'),
    landCoverTmpl = require('./templates/controls/landCover.html'),
    conservationPracticeTmpl = require('./templates/controls/conservationPractice.html'),
    precipitationTmpl = require('./templates/controls/precipitation.html'),
    summaryTmpl = require('./templates/controls/summary.html');

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

// Drawing control base class.
var DrawControlView = ControlView.extend({
    ui: {
        drawControl: '[data-value]'
    },

    events: {
        'click @ui.drawControl': 'startDrawing'
    },

    startDrawing: function(e) {
        var self = this,
            $el = $(e.currentTarget),
            controlName = this.getControlName(),
            controlValue = $el.data('value'),
            map = App.getLeafletMap(),
            drawOpts = modificationConfigUtils.getDrawOpts(controlValue);
        drawUtils.drawPolygon(map, drawOpts).then(function(geojson) {
            self.addModification(new models.ModificationModel({
                name: controlName,
                value: controlValue,
                shape: geojson
            }));
        });
    }
});

var SummaryView = Marionette.ItemView.extend({
    template: summaryTmpl,

    modelEvents: {
        'change:thumbValue': 'render'
    },

    templateHelpers: function() {
        var thumbValue = this.model.get('thumbValue'),
            label = '',
            summary = '';
        if (thumbValue) {
            label = modificationConfigUtils.getHumanReadableName(thumbValue);
            summary = modificationConfigUtils.getHumanReadableSummary(thumbValue);
        }
        return {
            label: label,
            summary: summary
        };
    }
});

var ModificationsView = DrawControlView.extend({
    ui: _.defaults({
        thumb: '.thumb',
        button: 'button'
    }, DrawControlView.prototype.ui),

    regions: {
        summaryRegion: '.summary-region'
    },

    events: _.defaults({
        'mouseenter @ui.thumb': 'setThumbValue',
        'click @ui.button': 'clearThumbValue'
    }, DrawControlView.prototype.events),

    templateHelpers: {
        labelFn: modificationConfigUtils.getHumanReadableShortName
    },

    setThumbValue: function(e) {
        this.model.setThumbValue($(e.currentTarget).data('value'));
    },

    clearThumbValue: function() {
        this.model.clearThumbValue();
    },

    onShow: function() {
        this.showChildView('summaryRegion', new SummaryView({model: this.model}));
    }
});

var LandCoverView = ModificationsView.extend({
    template: landCoverTmpl,

    getControlName: function() {
        return 'landcover';
    }
});

var ConservationPracticeView = ModificationsView.extend({
    template: conservationPracticeTmpl,

    getControlName: function() {
        return 'conservation_practice';
    }
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

    getControlName: function() {
        return 'precipitation';
    },

    getDisplayValue: function(value) {
        return value.toFixed(1) + '"';
    },

    onSliderDragged: function() {
        // Preview slider value while dragging.
        var value = parseFloat(this.ui.slider.val());
        this.ui.displayValue.text(this.getDisplayValue(value));
    },

    onSliderChanged: function() {
        var value = parseFloat(this.ui.slider.val()),
            modification = new models.ModificationModel({
                name: this.getControlName(),
                value: value
            });
        this.addOrReplaceInput(modification);
    },

    onRender: function() {
        var model = this.controlModel,
            value = model && model.get('value') || 0;

        this.ui.slider.val(value);
        this.ui.displayValue.text(this.getDisplayValue(value));
    }
});

function getControlView(controlName) {
    switch (controlName) {
        case 'landcover':
            return LandCoverView;
        case 'conservation_practice':
            return ConservationPracticeView;
        case 'precipitation':
            return PrecipitationView;
    }
    throw 'Control not implemented: ' +  controlName;
}

module.exports = {
    LandCoverView: LandCoverView,
    ConservationPracticeView: ConservationPracticeView,
    PrecipitationView: PrecipitationView,
    getControlView: getControlView
};
