"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    modalViews = require('../../../core/modals/views'),
    models = require('./models'),
    modalTmpl = require('./templates/modal.html');

var WeatherDataModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'weather-data-modal',
    className: 'modal modal-large fade',

    ui: {
        form: 'form',
        weatherTypeRadio: 'input[name="weather-type"]',
        fileInput: '.file-input',
        fileSelect: '.file-select',
        fileSelectText: '.file-select > input[type="text"]',
        uploadButton: 'button.upload',
        saveButton: 'button.save',
    },

    events: _.defaults({
        'change @ui.weatherTypeRadio': 'onWeatherTypeChange',
        'click @ui.fileSelect': 'onSelectClick',
        'change @ui.fileInput': 'onFileSelect',
        'click @ui.uploadButton': 'onUploadClick',
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    templateHelpers: function() {
        return {
            scenario_id: this.scenario.get('id'),
        };
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification', 'scenario']);
    },

    validateModal: function() {
        // TODO Add Validation
        // this.ui.saveButton.prop('disabled', autoTotal !== userTotal);
    },

    onWeatherTypeChange: function(e) {
        this.model.set('weatherType', e.target.value);
    },

    onSelectClick: function() {
        this.ui.fileInput.trigger('click');
    },

    onFileSelect: function(e) {
        var f = e.target.files.length > 0 && e.target.files[0];

        if (f) {
            this.ui.fileSelectText.val(f.name);
            this.ui.uploadButton.removeClass('hidden');
        } else {
            this.ui.fileSelectText.val(null);
            this.ui.uploadButton.addClass('hidden');
        }
    },

    onUploadClick: function() {
        $.ajax({
            url: '/mmw/modeling/scenarios/' + this.scenario.get('id') + '/custom-weather-data/',
            type: 'POST',
            data: new FormData(this.ui.form[0]),

            // Necessary options for file uploads
            cache: false,
            contentType: false,
            processData: false,
        });
    },

    saveAndClose: function() {
        // TODO Update Scenario Settings
        // TODO Trigger Reclaculation
        // this.addModification(this.model.getOutput());

        this.hide();
    }
});

function showWeatherDataModal(scenario, addModification) {
    var model = new models.WindowModel();

    new WeatherDataModal({
        model: model,
        scenario: scenario,
        addModification: addModification,
    }).render();
}

module.exports = {
    showWeatherDataModal: showWeatherDataModal,
};
