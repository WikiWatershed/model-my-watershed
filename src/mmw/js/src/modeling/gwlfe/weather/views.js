"use strict";

var _ = require('lodash'),
    Marionette = require('../../../../shim/backbone.marionette'),
    constants = require('../../constants'),
    utils = require('../../utils'),
    modalModels = require('../../../core/modals/models'),
    modalViews = require('../../../core/modals/views'),
    models = require('./models'),
    modalTmpl = require('./templates/modal.html'),
    uploadTmpl = require('./templates/upload.html'),
    existingTmpl = require('./templates/existing.html');

var WeatherType = constants.WeatherType,
    Simulations = constants.Simulations;

var WeatherDataModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'weather-data-modal',
    className: 'modal modal-large fade',

    regions: {
        customWeatherRegion: '#custom-weather-region'
    },

    ui: {
        weatherTypeRadio: 'input[name="weather-type"]',
        availableDataSelect: '#available-data',
    },

    events: _.defaults({
        'change @ui.weatherTypeRadio': 'onWeatherTypeDOMChange',
        'change @ui.availableDataSelect': 'onAvailableDataDOMChange',
    }, modalViews.ModalBaseView.prototype.events),

    modelEvents: {
        'change:custom_weather_file_name': 'showWeatherDataView',
        'change:weather_type': 'onWeatherTypeModelChange',
        'change:available_data': 'onAvailableDataModelChange',
        'change:weather_type change:simulation_weather_output change:custom_weather_output change:custom_weather_file_name': 'validateAndSave',
    },

    templateHelpers: function() {
        return {
            Simulations: Simulations,
        };
    },

    initialize: function(options) {
        this.mergeOptions(options, ['addModification', 'scenario']);
    },

    // Override to populate fields
    onRender: function() {
        var self = this;

        this.model
            .fetchWeatherIfNeeded()
            .always(function() {
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
    },

    onWeatherTypeDOMChange: function(e) {
        var available_data = this.model.get('available_data'),
            newWeatherType = e.target.value;

        if (newWeatherType === WeatherType.CUSTOM) {
            this.model.set('weather_type', newWeatherType);
        } else {
            if (available_data === WeatherType.DEFAULT) {
                this.model.set('weather_type', WeatherType.DEFAULT);
            } else {
                this.model.set('weather_type', WeatherType.SIMULATION);
            }
        }
    },

    onWeatherTypeModelChange: function() {
        var weather_type =
                this.model.get('weather_type') === WeatherType.CUSTOM ?
                    WeatherType.CUSTOM : WeatherType.DEFAULT,
            radio =
                this.$('input[name="weather-type"][value="' + weather_type + '"]');

        radio.prop('checked', true);
    },

    onAvailableDataDOMChange: function(e) {
        if (e.target.value === WeatherType.DEFAULT) {
            this.model.set({
                weather_type: WeatherType.DEFAULT,
                available_data: e.target.value,
            });
        } else {
            this.model.set({
                weather_type: WeatherType.SIMULATION,
                available_data: e.target.value,
            });
            this.model.fetchSimulationWeatherIfNeeded();
        }
    },

    onAvailableDataModelChange: function() {
        this.ui.availableDataSelect.val(this.model.get('available_data'));
    },

    validateAndSave: function() {
        var oldWeather = this.scenario.get('weather_type'),
            newWeather = this.model.get('weather_type'),
            oldSimulation = this.scenario.get('weather_simulation'),
            newSimulation = this.model.get('simulation_weather_category');

        if (this.model.isValid() && (
                oldWeather !== newWeather ||
                oldSimulation !== newSimulation
        )) {
            // Set weather type silently so it doesn't trigger it's own save
            this.scenario.set('weather_type', newWeather, { silent: true });
            // Save simulation type if applicable
            if (newWeather === WeatherType.SIMULATION) {
                this.scenario.set(
                    'weather_simulation',
                    newSimulation,
                    { silent: true }
                );
            } else if (newWeather === WeatherType.DEFAULT) {
                this.scenario.set(
                    'weather_simulation',
                    null,
                    { silent: true }
                );
            }
            this.addModification(this.model.getOutput());
        }
    },
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
        deleteErrorBox: '.delete-error-box',
        deleteErrorList: '.delete-error-list',
    },

    events: {
        'click @ui.delete': 'onDeleteClick',
    },

    modelEvents: {
        'change:custom_weather_errors': 'onServerValidation',
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

    onServerValidation: function() {
        var custom_weather_errors = this.model.get('custom_weather_errors');

        if (custom_weather_errors.length > 0) {
            this.ui.deleteErrorBox.removeClass('hidden');
            this.ui.deleteErrorList.html(
                custom_weather_errors
                    .map(function(err) { return '<li>' + err + '</li>'; })
                    .join('')
            );
        }
    },
});

function showWeatherDataModal(project, addModification) {
    var scenario = project.get('scenarios').findWhere({ active: true }),
        weather_type = scenario.get('weather_type'),
        weather_mod = scenario.get('modifications').findWhere({ modKey: 'weather_data' }),
        model = new models.WindowModel({
            is_editable: utils.isEditable(scenario),
            project_id: project.get('id'),
            in_drb: project.get('in_drb'),
            in_drwi: project.get('in_drwi'),
            in_pa: project.get('in_pa'),
            scenario_id: scenario.get('id'),
            weather_type: weather_type,
            available_data:
                (weather_type === WeatherType.SIMULATION &&
                 scenario.get('weather_simulation')) ||
                WeatherType.DEFAULT,
            simulation_weather_output: weather_type === WeatherType.SIMULATION ?
                weather_mod && weather_mod.get('output') : null,
            simulation_weather_category: scenario.get('weather_simulation'),
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
