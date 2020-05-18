"use strict";

var _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    WeatherType = require('../../constants').WeatherType,
    utils = require('../../utils'),
    modalModels = require('../../../core/modals/models'),
    modalViews = require('../../../core/modals/views'),
    models = require('./models'),
    modalTmpl = require('./templates/modal.html'),
    uploadTmpl = require('./templates/upload.html'),
    existingTmpl = require('./templates/existing.html');

var WeatherDataModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'weather-data-modal',
    className: 'modal modal-large fade',

    regions: {
        customWeatherRegion: '#custom-weather-region'
    },

    ui: {
        weatherTypeRadio: 'input[name="weather-type"]',
        saveButton: 'button.save',
    },

    events: _.defaults({
        'change @ui.weatherTypeRadio': 'onWeatherTypeDOMChange',
        'click @ui.saveButton': 'saveAndClose',
    }, modalViews.ModalBaseView.prototype.events),

    modelEvents: {
        'change:custom_weather_file_name': 'showWeatherDataView',
        'change:weather_type': 'onWeatherTypeModelChange',
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification', 'scenario']);
    },

    // Override to populate fields
    onRender: function() {
        var self = this;

        this.model.fetchCustomWeatherIfNeeded().then(function() {
            self.showWeatherDataView();
            self.$el.modal('show');
        });
    },

    showWeatherDataView: function() {
        var custom_weather_file_name = this.model.get('custom_weather_file_name'),
            WeatherDataView = custom_weather_file_name === null ?
                UploadWeatherDataView : ExistingWeatherDataView;

        this.customWeatherRegion.show(new WeatherDataView({
            model: this.model,
        }));

        this.validateModal();
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
    },

    onWeatherTypeDOMChange: function(e) {
        this.model.set('weather_type', e.target.value);

        this.validateModal();
    },

    onWeatherTypeModelChange: function() {
        var weather_type =
                this.model.get('weather_type') === WeatherType.CUSTOM ?
                    WeatherType.CUSTOM : WeatherType.DEFAULT,
            radio =
                this.$('input[name="weather-type"][value="' + weather_type + '"]');

        radio.prop('checked', true);

        this.validateModal();
    },

    saveAndClose: function() {
        this.addModification(this.model.getOutput());
        this.scenario.set('weather_type', this.model.get('weather_type'));

        this.hide();
    }
});

var UploadWeatherDataView = Marionette.ItemView.extend({
    template: uploadTmpl,

    ui: {
        form: 'form',
        fileInput: '.file-input',
        fileSelect: '.file-select',
        fileSelectText: '.file-select > input[type="text"]',
        uploadButton: '.upload-button',
        uploadErrorBox: '.upload-error-box',
        uploadErrorList: '.upload-error-list',
    },

    events: {
        'click @ui.fileSelect': 'onSelectClick',
        'change @ui.fileInput': 'onFileSelect',
        'click @ui.uploadButton': 'onUploadClick',
    },

    modelEvents: {
        'change:custom_weather_errors': 'onServerValidation',
    },

    onSelectClick: function() {
        this.model.set('weather_type', WeatherType.CUSTOM);
        this.ui.fileInput.trigger('click');
    },

    onFileSelect: function(e) {
        var f = e.target.files.length > 0 && e.target.files[0];

        if (f) {
            this.ui.fileSelectText.val(f.name);
            this.ui.uploadButton.removeClass('hidden').prop('disabled', false);
            this.ui.uploadErrorBox.addClass('hidden');
        } else {
            this.ui.fileSelectText.val(null);
            this.ui.uploadButton.addClass('hidden');
        }
    },

    onUploadClick: function() {
        var uploadButton = this.ui.uploadButton;

        uploadButton.prop('disabled', true);

        this.model
            .postCustomWeather(new FormData(this.ui.form[0]))
            .always(function() {
                uploadButton.prop('disabled', false);
            });
    },

    onServerValidation: function() {
        var custom_weather_errors = this.model.get('custom_weather_errors');

        if (custom_weather_errors.length > 0) {
            this.ui.uploadErrorBox.removeClass('hidden');
            this.ui.uploadErrorList.html(
                custom_weather_errors
                    .map(function(err) { return '<li>' + err + '</li>'; })
                    .join('')
            );
        }
    },
});

var ExistingWeatherDataView = Marionette.ItemView.extend({
    template: existingTmpl,

    ui: {
        delete: '.delete',
    },

    events: {
        'click @ui.delete': 'onDeleteClick',
    },

    templateHelpers: function() {
        return {
            custom_weather_file_name:
                utils.getFileName(this.model.get('custom_weather_file_name'), '.csv'),
        };
    },

    onDeleteClick: function() {
        var self = this,
            del = new modalViews.ConfirmView({
                model: new modalModels.ConfirmModel({
                    question: 'Are you sure you want to delete this weather file?',
                    confirmLabel: 'Delete',
                    cancelLabel: 'Cancel'
                })
            });

        del.render();

        del.on('confirmation', function() {
            self.model.deleteCustomWeather();
        });
    },
});

function showWeatherDataModal(scenario, addModification) {
    var weather_type = scenario.get('weather_type'),
        weather_mod = scenario.get('modifications').findWhere({ modKey: 'weather_data' }),
        model = new models.WindowModel({
            is_editable: utils.isEditable(scenario),
            scenario_id: scenario.get('id'),
            weather_type: weather_type,
            custom_weather_output: weather_type === WeatherType.CUSTOM ?
                weather_mod && weather_mod.get('output') : null,
            custom_weather_file_name: scenario.get('weather_custom'),
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
