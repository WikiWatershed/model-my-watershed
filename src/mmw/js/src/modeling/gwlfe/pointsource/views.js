"use strict";

var $ = require('jquery'),
    Marionette = require('../../../../shim/backbone.marionette'),
    utils = require('../../utils'),
    constants = require('../../constants'),
    models = require('./models'),
    pointsourceTemplate = require('./content-template.html');

var PointSourceDataView = Marionette.ItemView.extend({
    template: pointsourceTemplate,

    ui: {
        pointSourceDataItems: '.list-item',
        pointSourceDataSelect: '#pointsource-list',
    },

    events: {
        'click @ui.pointSourceDataItems': 'onPointSourceDOMItemClick',
    },

    modelEvents: {
        'change:pointsource_output': 'validateAndSave',
    },

    templateHelpers: function() {
        return {
            PointSourceTypes: Object.keys(constants.PointSourceType),
        };
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification', 'scenario']);
    },

    onPointSourceDOMItemClick: function(e) {
        var newPointSourceType = $(e.currentTarget).data('value');
        this.model.set('pointsource_type', newPointSourceType);
        this.model.fetchPointSourceData();
    },

    validateAndSave: function() {
        var oldPointSourceType = this.scenario.get('pointsource_type'),
            newPointSourceType = this.model.get('pointsource_type');

        if (this.model.isValid() && (
                oldPointSourceType !== newPointSourceType
        )) {
            this.scenario.set('pointsource_type', newPointSourceType);
            var modifications = this.model.getOutputs();
            modifications.forEach(function(mod){
                this.addModification(mod);
            });
        }
    },
});

function showPointSourceDataView(project, scenario, addModification) {
    var model = new models.WindowModel({
            is_editable: utils.isEditable(scenario),
            project_id: project.get('id'),
            in_drb: project.get('in_drb'),
            in_pa: project.get('in_pa'),
            in_conus: project.get('in_conus'),
            scenario_id: scenario.get('id'),
            pointsource_type: scenario.get('pointsource_type'),
            pointsource_output: null,
        });

    return new PointSourceDataView({
        model: model,
        project: project,
        scenario: scenario,
        addModification: addModification,
    });
}

module.exports = {
    showPointSourceDataView: showPointSourceDataView,
};
