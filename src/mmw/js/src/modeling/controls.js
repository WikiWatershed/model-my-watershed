"use strict";

var _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    drawUtils = require('../draw/utils'),
    models = require('./models'),
    landCoverTmpl = require('./templates/controls/landCover.html'),
    conservationPracticeTmpl = require('./templates/controls/conservationPractice.html'),
    precipitationTmpl = require('./templates/controls/precipitation.html');

// Simulation input controls base class.
var ControlView = Marionette.ItemView.extend({
    model: models.ModelPackageControlModel,
    className: 'inline',

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
        drawUtils.drawPolygon(map).then(function(geojson) {
            self.addModification(new models.ModificationModel({
                name: controlName,
                value: controlValue,
                shape: geojson
            }));
        });
    }
});

var LandCoverView = DrawControlView.extend({
    template: landCoverTmpl,

    getControlName: function() {
        return 'landcover';
    }
});

var ConservationPracticeView = DrawControlView.extend({
    template: conservationPracticeTmpl,

    getControlName: function() {
        return 'conservation_practice';
    }
});

var PrecipitationView = ControlView.extend({
    template: precipitationTmpl,

    ui: {
        slider: '.selectpicker'
    },

    events: {
        'change @ui.slider': 'update'
    },

    onRender: function() {
        var model = this.modificationModel;
        if (model) {
            this.ui.slider.find('[value="' + model.get('value') + '"]')
                .attr('selected', 'selected');
        }
    },

    update: function(e) {
        var $el = $(e.currentTarget),
            value = $el.val(),
            modification = new models.ModificationModel({
                name: this.getControlName(),
                value: value
            });
        this.addOrReplaceModification(modification);
    },

    getControlName: function() {
        return 'precipitation';
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
