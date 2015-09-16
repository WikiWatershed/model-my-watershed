"use strict";

var $ = require('jquery'),
    _ = require('underscore'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    coreUtils = require('../core/utils'),
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
    template: summaryTmpl
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
        'mouseenter @ui.thumb': 'onMouseHover'
    }, DrawControlView.prototype.events),

    onMouseHover: function(e) {
        var value = $(e.currentTarget).data('value');
        this.summaryRegion.show(new SummaryView({
            model: new Backbone.Model({
                value: value
            })
        }));
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
        case 'precipitation':
            return PrecipitationView;
    }
    throw 'Control not implemented: ' +  controlName;
}

module.exports = {
    LandCoverView: LandCoverView,
    ConservationPracticeView: ConservationPracticeView,
    PrecipitationView: PrecipitationView,
    getControlView: getControlView,
    PrecipitationSynchronizer: PrecipitationSynchronizer
};
