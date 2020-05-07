"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    WeatherType = require('../../constants').WeatherType,
    utils = require('../../../core/utils'),
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
        uploadButton: '.upload-button',
        uploadErrorBox: '.upload-error-box',
        uploadErrorList: '.upload-error-list',
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
        var weather_type = this.model.get('weather_type'),
            custom_weather_output = this.model.get('custom_weather_output'),
            custom_weather_errors = this.model.get('custom_weather_errors'),

            valid_default = weather_type === WeatherType.DEFAULT,
            valid_simulation = weather_type === WeatherType.SIMULATION,
            valid_custom = weather_type === WeatherType.CUSTOM &&
                custom_weather_output !== null &&
                custom_weather_errors.length === 0,

            disabled = !(valid_default || valid_simulation || valid_custom);


        this.ui.saveButton.prop('disabled', disabled);

        if (custom_weather_errors.length > 0) {
            this.ui.uploadErrorBox.removeClass('hidden');
            this.ui.uploadErrorList.html(
                custom_weather_errors
                    .map(function(e) { return '<li>' + e + '</li>'; })
                    .join('')
            );
        } else {
            this.ui.uploadErrorBox.addClass('hidden');
            this.ui.uploadErrorList.html('');
        }
    },

    onWeatherTypeChange: function(e) {
        this.model.set('weather_type', e.target.value);

        this.validateModal();
    },

    onSelectClick: function() {
        this.ui.fileInput.trigger('click');
    },

    onFileSelect: function(e) {
        var f = e.target.files.length > 0 && e.target.files[0];

        if (f) {
            this.ui.fileSelectText.val(f.name);
            this.ui.uploadButton.removeClass('hidden');
            this.ui.uploadErrorBox.addClass('hidden');
        } else {
            this.ui.fileSelectText.val(null);
            this.ui.uploadButton.addClass('hidden');
        }
    },

    onUploadClick: function() {
        var self = this;

        $.ajax({
            url: '/mmw/modeling/scenarios/' + this.scenario.get('id') + '/custom-weather-data/',
            type: 'POST',
            data: new FormData(this.ui.form[0]),

            // Necessary options for file uploads
            cache: false,
            contentType: false,
            processData: false,
        }).then(function(data) {
            self.model.set({
                custom_weather_output: data.output,
                custom_weather_errors: [],
            });

            self.validateModal();
        }).catch(function(err) {
            var errors = err && err.responseJSON && err.responseJSON.errors;

            self.model.set({
                custom_weather_output: null,
                custom_weather_errors: errors || ['Unknown server error.'],
            });

            self.validateModal();
        });
    },

    saveAndClose: function() {
        this.addModification(this.model.getOutput());
        this.scenario.set('weather_type', this.model.get('weather_type'));

        this.hide();
    }
});

function showWeatherDataModal(scenario, addModification) {
    var weather_type = scenario.get('weather_type'),
        weather_mod = scenario.get('modifications').findWhere({ modKey: 'weather_data' }),
        model = new models.WindowModel({
            weather_type: weather_type,
            custom_weather_output: weather_type === WeatherType.CUSTOM ?
                weather_mod && weather_mod.get('output') : null,
            custom_weather_file_name: weather_type === WeatherType.CUSTOM ?
                utils.getFileName(scenario.get('weather_custom')) : null,
        });

    new WeatherDataModal({
        model: model,
        scenario: scenario,
        addModification: addModification,
    }).render();
}

module.exports = {
    showWeatherDataModal: showWeatherDataModal,
};
