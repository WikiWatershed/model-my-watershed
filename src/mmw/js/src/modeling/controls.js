"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    patterns = require('../core/patterns'),
    models = require('./models'),
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
            'modificationModel',
            'addModification',
            'addOrReplaceModification'
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
            map = App.getLeafletMap();
        drawUtils.drawPolygon(map, patterns.getDrawOpts(controlValue)).then(function(geojson) {
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
            label = models.getHumanReadableLabel(thumbValue);
            summary = models.getHumanReadableSummary(thumbValue);
        }
        return {
            label: label,
            summary: summary
        };
    }
});

var ModificationsView = DrawControlView.extend({
    ui: _.defaults({
        thumb: '.thumb'
    }, DrawControlView.prototype.ui),

    regions: {
        summaryRegion: '.summary-region'
    },

    events: _.defaults({
        'mouseenter @ui.thumb': 'setThumbValue',
        'mouseleave @ui.thumb': 'clearThumbValue'
    }, DrawControlView.prototype.events),

    templateHelpers: {
        labelFn: models.getHumanReadableLabel
    },

    setThumbValue: function(event) {
        this.model.set('thumbValue', $(event.currentTarget).data('value'));
    },

    clearThumbValue: function() {
        this.model.set('thumbValue', null);
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
        this.addOrReplaceModification(modification);
    },

    onRender: function() {
        var model = this.modificationModel,
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
