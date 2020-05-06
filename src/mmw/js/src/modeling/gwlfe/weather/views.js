"use strict";

var _ = require('lodash'),
    modalViews = require('../../../core/modals/views'),
    modalTmpl = require('./templates/modal.html');

var WeatherDataModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'weather-data-modal',
    className: 'modal modal-large fade',

    ui: {
        saveButton: 'button.save',
    },

    events: _.defaults({
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    initialize: function(options) {
        this.mergeOptions(options, ['addModification']);
    },

    validateModal: function() {
        // TODO Add Validation
        // this.ui.saveButton.prop('disabled', autoTotal !== userTotal);
    },

    saveAndClose: function() {
        // TODO Update Scenario Settings
        // TODO Trigger Reclaculation
        // this.addModification(this.model.getOutput());

        this.hide();
    }
});

function showWeatherDataModal(scenario, addModification) {
    // TODO Create window model to track data

    new WeatherDataModal({
        model: scenario,
        addModification: addModification,
    }).render();
}

module.exports = {
    showWeatherDataModal: showWeatherDataModal,
};
