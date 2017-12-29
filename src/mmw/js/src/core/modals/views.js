"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    coreUtils = require('../utils.js'),
    HighstockChart = require('../../../shim/highstock'),
    Marionette = require('../../../shim/backbone.marionette'),
    Clipboard = require('clipboard'),
    moment = require('moment'),
    models = require('./models'),
    modalConfirmTmpl = require('./templates/confirmModal.html'),
    modalConfirmLargeTmpl = require('./templates/confirmModalLarge.html'),
    modalInputTmpl = require('./templates/inputModal.html'),
    modalPlotTmpl = require('./templates/plotModal.html'),
    modalShareTmpl = require('./templates/shareModal.html'),
    modalMultiShareTmpl = require('./templates/multiShareModal.html'),
    modalHydroShareTmpl = require('./templates/hydroShareExportModal.html'),
    modalAlertTmpl = require('./templates/alertModal.html'),
    modalIframeTmpl = require('./templates/iframeModal.html'),
    vizerUrls = require('../settings').get('vizer_urls'),

    GWLFE = 'gwlfe',
    ENTER_KEYCODE = 13,
    ESCAPE_KEYCODE = 27,
    BASIC_MODAL_CLASS = 'modal modal-basic fade',
    LARGE_MODAL_CLASS = 'modal modal-large fade';

var ModalBaseView = Marionette.LayoutView.extend({
    className: BASIC_MODAL_CLASS,

    attributes: function() {
        var defaults = { 'tabindex': '-1' },
            feedbackRequired = {
                'data-backdrop': 'static',
                'data-keyboard': 'false'
            };

        // If feedback is required, we don't allow the user to get away from
        // the modal without clicking confirm or deny. This way we ensure we
        // get an event one way or another.
        // http://getbootstrap.com/javascript/#modals-options
        return this.model.get('feedbackRequired') ? _.extend(defaults, feedbackRequired) : defaults;
    },

    events: {
        'shown.bs.modal': 'onModalShown',
        'keyup': 'onKeyUp',
        'hidden.bs.modal': 'onModalHidden'
    },

    onRender: function() {
        this.$el.modal('show');
    },

    onModalShown: function() {
        // Not implemented.
    },

    onKeyUp: function(e) {
        if (e.keyCode === ENTER_KEYCODE) {
            this.primaryAction();
        }
    },

    getDisabledState: function($el) {
        var model = this.model;

        if (coreUtils.modalButtonDisabled(model, $el)) {
            return true;
        } else {
            coreUtils.modalButtonToggle(model, $el, false);
            return false;
        }
    },

    primaryAction: function() {
        // Not implemented.
    },

    onModalHidden: function() {
        this.destroy();
    },

    hide: function() {
        this.$el.modal('hide');
    }
});

var ConfirmView = ModalBaseView.extend({
    template: modalConfirmTmpl,

    ui: {
        confirmation: '.confirm',
        deny: '.btn-default'
    },

    events: _.defaults({
        'click @ui.confirmation': 'primaryAction',
        'click @ui.deny': 'dismissAction'
    }, ModalBaseView.prototype.events),

    primaryAction: function() {
        if (this.getDisabledState(this.ui.confirmation)) {
            return;
        }

        this.triggerMethod('confirmation');
        this.hide();
    },

    dismissAction: function() {
        this.triggerMethod('deny');
    }
});

var ConfirmLargeView = ConfirmView.extend({
    className: LARGE_MODAL_CLASS,
    template: modalConfirmLargeTmpl,
});

var InputView = ModalBaseView.extend({
    template: modalInputTmpl,

    ui: {
        save: '.save',
        input: 'input',
        error: '.error'
    },

    events: _.defaults({
        'click @ui.save': 'primaryAction'
    }, ModalBaseView.prototype.events),

    onModalShown: function() {
        this.ui.input.focus().select();
    },

    primaryAction: function() {
        if (this.getDisabledState(this.ui.save) === true) {
            return;
        }

        var val = this.ui.input.val().trim(),
            validationMessage = this.model.validate(val);

        if (val && !validationMessage) {
            this.triggerMethod('update', val);
            this.hide();
        } else {
            var inputType = this.model.get('fieldLabel').toLowerCase(),
                errorText = validationMessage || ('Please enter a valid ' + inputType);
            this.ui.error.text(errorText);
            coreUtils.modalButtonToggle(this.model, this.ui.save, true);
        }
    }
});

var ShareView = ModalBaseView.extend({
    template: modalShareTmpl,

    ui: {
        'signin': '.signin',
        'copy': '.copy',
        'input': 'input'
    },

    events: _.defaults({
        'click @ui.signin': 'signIn'
    }, ModalBaseView.prototype.events),

    // Override to attach Clipboard to ui.copy button
    onRender: function() {
        var self = this;

        this.$el.on('shown.bs.modal', function() {
            new Clipboard(self.ui.copy[0]);
        });

        if (this.model.get('is_private')) {
            var question = 'This project is currently private. ' +
                    'You must make it public before it can be shared with others. ' +
                    'Once public, anyone with the URL can access it.',
                confirm = new ConfirmView({
                    model: new models.ConfirmModel({
                        question: question,
                        confirmLabel: 'Make Public',
                        cancelLabel: 'Cancel'
                    })
                });

            confirm.render();
            confirm.on('confirmation', function() {
                var project = self.options.project || self.options.app.currentProject;

                project.set('is_private', false);
                project.saveProjectListing();

                self.$el.modal('show');
            });
        } else {
            this.$el.modal('show');
        }
    },

    onModalShown: function() {
        this.ui.input.focus().select();
    },

    signIn: function() {
        this.options.app.getUserOrShowLogin();
    }
});

var MultiShareView = ModalBaseView.extend({
    className: LARGE_MODAL_CLASS,
    template: modalMultiShareTmpl,

    ui: {
        'copy': '.copy',
        'shareUrl': '#share-url',
        'shareEnabled': '#share-enabled',
        'hydroShareEnabled': '#hydroshare-enabled',
        'hydroShareNotification': '#hydroshare-notification',
        'hydroShareSpinner': '.hydroshare-spinner',
        'hydroShareExport': '.hydroshare-export',
    },

    events: _.defaults({
        'click @ui.shareEnabled': 'onLinkToggle',
        'click @ui.hydroShareEnabled': 'connectHydroShare',
        'click @ui.hydroShareExport': 'reExportHydroShare',
    }, ModalBaseView.prototype.events),

    modelEvents: {
        'change:is_private': 'render',
    },

    templateHelpers: function() {
        return {
            url: window.location.origin + "/project/" + this.model.id + "/",
            guest: this.options.app.user.get('guest'),
            user_has_authorized_hydroshare: this.options.app.user.get('hydroshare'),
        };
    },

    // Override to attach Clipboard to ui.copy button
    onRender: function() {
        var self = this;

        if (this.$el.hasClass('in')) {
            // Already rendered, simply add the handler
            new Clipboard(self.ui.copy[0]);
        } else {
            this.$el.on('shown.bs.modal', function() {
                new Clipboard(self.ui.copy[0]);
            });

            this.$el.modal('show');
        }
    },

    onLinkToggle: function(e) {
        this.model.set('is_private', !e.target.checked);
        this.model.saveProjectAndScenarios();
    },

    connectHydroShare: function() {
        var self = this,
            userHasHydroShareAccess = this.options.app.user.get('hydroshare');

        if (userHasHydroShareAccess) {
            // User already has connected their account. Allow them to turn
            // this on and off at will.

            if (self.ui.hydroShareEnabled.prop('checked')) {
                self.exportToHydroShare();
            } else {
                self.disconnectHydroShare();
            }
        } else {
            // User has not connectd to HydroShare yet. Have them sign in
            // and allow MMW access, then enable the checkbox.

            var checkbox = self.ui.hydroShareEnabled,
                iframe = new IframeView({
                    model: new models.IframeModel({
                        href: '/user/hydroshare/login/',
                        signalSuccess: 'mmw-hydroshare-success',
                        signalFailure: 'mmw-hydroshare-failure',
                        signalCancel: 'mmw-hydroshare-cancel',
                    })
                });

            checkbox.prop('checked', false);
            iframe.render();

            iframe.on('success', function() {
                // Fetch user again to save new HydroShare Access state
                self.options.app.user.fetch();
                self.ui.hydroShareNotification.addClass('hidden');

                // Export to HydroShare
                self.exportToHydroShare();
            });
        }
    },

    exportToHydroShare: function() {
        var self = this,
            postHydroShareToServer = _.bind(this.postHydroShareToServer, this),
            hsModal = new HydroShareView({ model: this.model });

        self.setHydroShareLoading(true);
        hsModal.render();

        hsModal.on('export', postHydroShareToServer);

        hsModal.on('cancel', function() {
            self.render();
        });
    },

    disconnectHydroShare: function() {
        var self = this,
            confirm = new ConfirmLargeView({
                model: new models.ConfirmModel({
                    titleText: 'Unsynchronize Project',
                    question: [
                        'Unsynchronizing your project from HydroShare will ' +
                        'delete that resource. There is no way to undo this. ' +
                        'Continue?'
                    ],
                    confirmLabel: 'Unsynchronize',
                })
            });

        confirm.render();
        confirm.on('confirmation', function() {
            self.setHydroShareLoading(true);
            $.ajax({
                url: '/export/hydroshare?project=' + self.model.id,
                type: 'DELETE',
            }).then(function() {
                self.model.set('hydroshare', null);
                self.render();
            });
        });
        confirm.on('deny', function() {
            self.ui.hydroShareEnabled.prop('checked', true);
        });
    },

    setHydroShareLoading: function(is_loading) {
        if (!!is_loading) {
            this.ui.hydroShareSpinner.removeClass('hidden');
            this.ui.hydroShareEnabled.prop('disabled', true);
        } else {
            this.ui.hydroShareSpinner.addClass('hidden');
            this.ui.hydroShareEnabled.prop('disabled', false);
        }
    },

    postHydroShareToServer: function(payload) {
        var self = this,
            analyzeTasks = this.options.app.getAnalyzeCollection(),
            analyzeFiles = analyzeTasks.map(function(at) {
                return {
                    name: 'analyze_' + at.get('name') + '.csv',
                    contents: at.getResultCSV(),
                };
            }),
            scenarios = this.options.app.currentProject.get('scenarios'),
            getMapshedData = function(scenario) {
                var gisData = scenario.getGisData();
                if (!gisData) { return null; }

                return {
                    name: 'scenario_' +
                        scenario.get('name').toLowerCase().replace(/\s/g, '-') + '.gms',
                    data: gisData.model_input
                };
            },
            includeMapShedData = self.model.get('model_package') === GWLFE,
            mapshedData = includeMapShedData ? scenarios.map(getMapshedData) : null;

        return $.ajax({
            type: 'POST',
            url: '/export/hydroshare?project=' + self.model.id,
            contentType: 'application/json',
            data: JSON.stringify(_.defaults({
                files: analyzeFiles,
                mapshed_data: mapshedData,
            }, payload))
        }).then(function(result) {
            self.model.set('hydroshare', result);
            self.render();
        });
    },

    reExportHydroShare: function(e) {
        e.preventDefault();
        this.setHydroShareLoading(true);
        this.postHydroShareToServer();
        return false;
    }
});

var HydroShareView = ModalBaseView.extend({
    className: LARGE_MODAL_CLASS,
    template: modalHydroShareTmpl,

    ui: {
        'title': '#hydroshare-title',
        'abstract': '#hydroshare-abstract',
        'keywords': '#hydroshare-keywords',
        'export': '.btn-active',
        'cancel': '.btn-default',
    },

    events: _.defaults({
        'click @ui.export': 'primaryAction',
        'click @ui.cancel': 'dismissAction',
    }, ModalBaseView.prototype.events),

    primaryAction: function() {
        var title = this.ui.title.val().trim(),
            abstract = this.ui.abstract.val().trim(),
            keywords = this.ui.keywords.val().trim();

        if (title === "" || abstract === "") {
            return;
        }

        this.triggerMethod('export', {
            title: title,
            abstract: abstract,
            keywords: keywords,
        });
        this.hide();
    },

    dismissAction: function() {
        this.triggerMethod('cancel');
        this.hide();
    },

    onKeyUp: function(e) {
        if (e.keyCode === ENTER_KEYCODE && !this.ui.abstract.is(':focus')) {
            this.primaryAction();
        }

        if (e.keyCode === ESCAPE_KEYCODE) {
            this.dismissAction();
        }
    }
});

var AlertView = ModalBaseView.extend({
    template: modalAlertTmpl,

    ui: {
        dismiss: '.btn-default'
    },

    events: _.defaults({
        'click @ui.dismiss': 'dismissAction'
    }, ModalBaseView.prototype.events),

    dismissAction: function() {
        this.triggerMethod('dismiss');
    },

    templateHelpers: function() {
        return _.extend(this.model.get('alertType'), { alertMessage: this.model.get('alertMessage') });
    }
});

var IframeView = ModalBaseView.extend({
    template: modalIframeTmpl,

    initialize: function() {
        this.onPostMessage = _.bind(this.onPostMessage, this);

        window.addEventListener('message', this.onPostMessage, false);
    },

    onPostMessage: function(e) {
        var hide = _.bind(this.hide, this);

        if (e.origin !== window.location.origin) {
            return;
        }

        switch (e.data) {
            case this.model.get('signalSuccess'):
                this.triggerMethod('success');
                setTimeout(function() { hide(); }, 500);
                break;
            case this.model.get('signalFailure'):
                this.triggerMethod('failure');
                break;
            case this.model.get('signalCancel'):
                this.dismissAction();
                hide();
                break;
            default:
                this.triggerMethod('error');
        }
    },

    dismissAction: function() {
        this.triggerMethod('dismiss');
    },

    onDestroy: function() {
        window.removeEventListener('message', this.onPostMessage, false);
    }
});

var PlotView = ModalBaseView.extend({
    template: modalPlotTmpl,

    className: 'modal fade',

    initialize: function() {
        this.listenTo(this.model, 'change', this.render);

        // Cache series data after it is fetched.
        var seriesMap = _.object(_.map(this.model.get('measurements'), function(measurement) {
            return [measurement.var_id, null];
        }));
        this.model.set('seriesMap', seriesMap);

        this.LOADING = 'loading';
        this.FAILED = 'failed';
        this.COMPLETE = 'complete';
        this.model.set('status', null);

        this.plotMeasurement(this.model.get('currVarId'));
    },

    ui: {
        measurementSelector: 'select'
    },

    events: _.extend({}, ModalBaseView.prototype.events, {
        'change @ui.measurementSelector': 'updateMeasurement'
    }),

    updateMeasurement: function() {
        var varId = this.ui.measurementSelector.val();
        this.model.set('currVarId', varId);
        this.plotMeasurement(varId);
    },

    setSeries: function(varId, series) {
        var seriesMap = _.create({}, this.model.get('seriesMap'));
        seriesMap[varId] = series;
        this.model.set('seriesMap', seriesMap);
    },

    plotMeasurement: function(varId) {
        var self = this,
            series = self.model.get('seriesMap')[varId],
            dataUrl = vizerUrls.variable
               .replace(/{{var_id}}/, varId)
               .replace(/{{asset_id}}/, this.model.get('siso_id'));

        if (series) {
            self.model.set('status', self.COMPLETE);
            self.renderPlot();
        } else {
            self.model.set('status', self.LOADING);
            this.loadPlotData(dataUrl)
                .done(function(series) {
                    self.setSeries(varId, series);
                    if (varId === self.model.get('currVarId')) {
                        self.model.set('status', self.COMPLETE);
                        self.renderPlot();
                    }
                })
                .fail(function() {
                    if (varId === self.model.get('currVarId')) {
                        self.model.set('status', self.FAILED);
                    }
                });
        }
    },

   loadPlotData: function(url) {
       var loadedDeferred = $.Deferred(),
           loadTimeout = 30 * 1000; // timeout in milliseconds

       $.ajax({
          dataType: "json",
          url: url,
          timeout: loadTimeout
        })
        .done(function(observation) {
           // Handle cases where there is no data
           if (!observation.success) {
               loadedDeferred.reject();
           } else {
               var rawVizerSeries = _.first(observation.result).data,
                   series = _.map(rawVizerSeries, function(measurement) {
                       return [measurement.time * 1000, measurement.value];
                   });

               loadedDeferred.resolve(series);
           }
       })
       .fail(function() {
           loadedDeferred.reject();
       });

       return loadedDeferred;
    },

    renderPlot: function() {
        var helpers = this.templateHelpers(),
            measurement = helpers.measurement,
            series = helpers.series;

        // Only attempt rendering chart if the modal DOM element still exists.
        // This is needed because the user might close the modal while data is
        // still loading.
        if ($.contains(document, this.el)) {
            new HighstockChart({
                chart : {
                    renderTo : 'observation-plot'
                },

                rangeSelector : {
                    selected : 1,
                    buttons: [
                        { type: 'week', count: 1, text: '1w' },
                        { type: 'week', count: 2, text: '2w' },
                        { type: 'month', count: 1, text: '1m' },
                        { type: 'month', count: 2, text: '2m' },
                        { type: 'month', count: 3, text: '3m' },
                        { type: 'all', text: 'All' }]
                },

                xAxis: { ordinal: false },

                yAxis: {
                    title: {
                        text: measurement.units
                    }
                },

                lang: {
                    thousandsSep: ','
                },

                title : {
                    text : null
                },

                series : [{
                    name : measurement.name,
                    data : series,
                    color: '#389b9b',
                    tooltip: {
                        valueDecimals: 2,
                        valueSuffix: measurement.units
                    }
                }]
            });
        }
    },

    templateHelpers: function() {
        var currVarId = this.model.get('currVarId'),
            measurement = _.findWhere(this.model.get('measurements'), {
                var_id: currVarId
            }),
            series = this.model.get('seriesMap')[currVarId],
            lastUpdated = moment(measurement.lastUpdated).fromNow();

        return {
            measurement: measurement,
            series: series,
            lastUpdated: lastUpdated
        };
    }
});

module.exports = {
    ModalBaseView: ModalBaseView,
    ShareView: ShareView,
    MultiShareView: MultiShareView,
    InputView: InputView,
    ConfirmView: ConfirmView,
    ConfirmLargeView: ConfirmLargeView,
    PlotView: PlotView,
    IframeView: IframeView,
    AlertView: AlertView
};
