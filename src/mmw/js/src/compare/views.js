"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    moment = require('moment'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    coreModels = require('../core/models'),
    coreUtils = require('../core/utils'),
    coreViews = require('../core/views'),
    settings = require('../core/settings'),
    coreUnits = require('../core/units'),
    chart = require('../core/chart.js'),
    modalViews = require('../core/modals/views'),
    models = require('./models'),
    modelingModels = require('../modeling/models'),
    tr55Models = require('../modeling/tr55/models'),
    PrecipitationView = require('../modeling/controls').PrecipitationView,
    modConfigUtils = require('../modeling/modificationConfigUtils'),
    gwlfeConfig = require('../modeling/gwlfeModificationConfig'),
    GWLFE_LAND_COVERS = require('../modeling/constants').GWLFE_LAND_COVERS,
    compareModalTmpl = require('./templates/compareModal.html'),
    compareTabPanelTmpl = require('./templates/compareTabPanel.html'),
    compareInputsTmpl = require('./templates/compareInputs.html'),
    compareSelectionTmpl = require('./templates/compareSelection.html'),
    tr55CompareScenarioItemTmpl = require('./templates/tr55CompareScenarioItem.html'),
    gwlfeCompareScenarioItemTmpl = require('./templates/gwlfeCompareScenarioItem.html'),
    compareBarChartRowTmpl = require('./templates/compareBarChartRow.html'),
    compareLineChartRowTmpl = require('./templates/compareLineChartRow.html'),
    compareTableRowTmpl = require('./templates/compareTableRow.html'),
    compareModificationsPopoverTmpl = require('./templates/compareModificationsPopover.html'),
    compareDescriptionPopoverTmpl = require('./templates/compareDescriptionPopover.html'),
    constants = require('./constants'),
    utils = require('./utils');

var CompareModal = modalViews.ModalBaseView.extend({
    template: compareModalTmpl,

    id: 'compare-new',

    ui: {
        closeButton: '.compare-close > button',
        nextButton: '.compare-scenario-buttons > .btn-next-scenario',
        prevButton: '.compare-scenario-buttons > .btn-prev-scenario',
        spinner: '.spinner',
    },

    events: _.defaults({
        'click @ui.closeButton': 'hide',
        'click @ui.nextButton' : 'nextScenario',
        'click @ui.prevButton' : 'prevScenario',
    }, modalViews.ModalBaseView.prototype.events),

    modelEvents: {
        'change:mode': 'showSectionsView',
        'change:visibleScenarioIndex': 'highlightButtons',
        'change:polling': 'setPolling',
    },

    regions: {
        tabRegion: '.compare-tabs',
        inputsRegion: '.compare-inputs',
        scenariosRegion: '#compare-title-row',
        selectionRegion: '#compare-selection-region',
        sectionsRegion: '.compare-sections',
    },

    initialize: function() {
        var self = this;

        // Show the scenario row only after the bootstrap
        // modal has fired its shown event. The map
        // set up in the scenarios row needs to happen
        // after it has fully rendered
        this.$el.on('shown.bs.modal', function() {
            self.scenariosRegion.show(new ScenariosRowView({
                model: self.model,
                collection: self.model.get('scenarios'),
            }));

            // Show Sections View and update polling because
            // some charts need the Compare Window visible
            // before they can render properly
            self.showSectionsView();
            self.setPolling();
        });
    },

    highlightButtons: function() {
        var i = this.model.get('visibleScenarioIndex'),
            total = this.model.get('scenarios').length,
            minScenarios = constants.MIN_VISIBLE_SCENARIOS,
            prevButton = this.ui.prevButton,
            nextButton = this.ui.nextButton;

        if (total <= minScenarios) {
            prevButton.hide();
            nextButton.hide();
        } else {
            if (i < 1) {
                prevButton.removeClass('active');
            } else {
                prevButton.addClass('active');
            }

            if (i + minScenarios >= total) {
                nextButton.removeClass('active');
            } else {
                nextButton.addClass('active');
            }
        }
    },

    onShow: function() {
        var tabPanelsView = new TabPanelsView({
                collection: this.model.get('tabs'),
            }),
            showSectionsView = _.bind(this.showSectionsView, this);

        tabPanelsView.on('renderTabs', showSectionsView);

        this.tabRegion.show(tabPanelsView);
        this.inputsRegion.show(new InputsView({
            model: this.model,
        }));

        this.highlightButtons();
    },

    showSectionsView: function() {
        var activeTab = this.model.get('tabs').findWhere({ active: true });

        switch (this.model.get('modelPackage')) {
            case coreUtils.GWLFE:
                this.showGwlfeSectionsView();
                this.showSelectionView(activeTab);
                break;
            case coreUtils.TR55_PACKAGE:
                this.showTr55SectionsView();
                break;
            default:
                window.console.warn('Invalid model package', this.model.get('modelPackage'));
                break;
        }
    },

    showTr55SectionsView: function() {
        if (this.model.get('mode') === constants.CHARTS) {
            this.sectionsRegion.show(new Tr55ChartView({
                model: this.model,
                collection: this.model.get('tabs')
                                .findWhere({ active: true })
                                .get('charts'),
            }));
        } else {
            this.sectionsRegion.show(new TableView({
                model: this.model,
                collection: this.model.get('tabs')
                                .findWhere({ active: true })
                                .get('table'),
            }));
        }
    },

    showGwlfeSectionsView: function() {
        var activeTab = this.model.get('tabs').findWhere({ active: true }),
            activeName = activeTab.get('name'),
            activeMode = this.model.get('mode'),
            isHydrology = activeName === constants.HYDROLOGY,
            config = { model: this.model, collection: activeTab.get(activeMode) },
            View = (function() {
                    if (activeMode === constants.CHARTS) {
                        return isHydrology ?
                            GwlfeHydrologyChartView : GwlfeQualityChartView;
                    } else {
                        return isHydrology ?
                            GwlfeHydrologyTableView : GwlfeQualityTableView;
                    }
                })();

        if (View) {
            this.sectionsRegion.show(new View(config));
        } else {
            this.sectionsRegion.empty();
        }
    },

    showSelectionView: function(activeTab) {
        var activeMode = this.model.get('mode'),
            chartsOrTable = activeTab.get(activeMode),
            selections = activeTab.get('selections'),
            isHydrologyChart = activeMode === constants.CHARTS &&
                    activeTab.get('name') === constants.HYDROLOGY,
            update = function() {
                chartsOrTable.update(selections.findWhere({ active: true }));
            };

        // Remove old listeners
        this.model.get('tabs').forEach(function(tab) {
            var tabSelections = tab.get('selections');

            if (tabSelections) {
                tabSelections.off();
            }
        });

        if (selections && !isHydrologyChart) {
            this.selectionRegion.show(new SelectionView({
                model: activeTab,
            }));

            selections.on('change', update);
            update();
        } else {
            this.selectionRegion.empty();
        }
    },

    onModalHidden: function() {
        App.rootView.compareRegion.empty();
    },

    nextScenario: function() {
        var visibleScenarioIndex = this.model.get('visibleScenarioIndex'),
            last = Math.max(0, this.model.get('scenarios').length -
                               constants.MIN_VISIBLE_SCENARIOS);

        this.model.set({
            visibleScenarioIndex: Math.min(++visibleScenarioIndex, last)
        });
    },

    prevScenario: function() {
        var visibleScenarioIndex = this.model.get('visibleScenarioIndex');

        this.model.set({
            visibleScenarioIndex: Math.max(--visibleScenarioIndex, 0)
        });
    },

    setPolling: function() {
        if (this.model.get('polling')) {
            this.ui.spinner.removeClass('hidden');
            this.sectionsRegion.$el.addClass('polling');
        } else {
            this.ui.spinner.addClass('hidden');
            this.sectionsRegion.$el.removeClass('polling');
        }
    },
});

var TabPanelView = Marionette.ItemView.extend({
    template: compareTabPanelTmpl,
    tagName: 'a',
    className: 'compare-tab',
    attributes: {
        href: '',
        role: 'tab',
    },

    modelEvents: {
        'change': 'render',
    },

    triggers: {
        'click': 'tab:clicked',
    },

    onRender: function() {
        if (this.model.get('active')) {
            this.$el.addClass('active');
        } else {
            this.$el.removeClass('active');
        }
    },
});

var TabPanelsView = Marionette.CollectionView.extend({
    childView: TabPanelView,

    onChildviewTabClicked: function(view) {
        if (view.model.get('active')) {
            // Active tab clicked. Do nothing.
            return;
        }

        this.collection.findWhere({ active: true })
                       .set({ active: false });

        view.model.set({ active: true });

        this.triggerMethod('renderTabs');
    },
});

var InputsView = Marionette.LayoutView.extend({
    template: compareInputsTmpl,

    ui: {
        chartButton: '#compare-input-button-chart',
        tableButton: '#compare-input-button-table',
        downloadButton: '#compare-input-button-download'
    },

    events: {
        'click @ui.chartButton': 'setChartView',
        'click @ui.tableButton': 'setTableView',
        'click @ui.downloadButton': 'downloadCSV'
    },

    regions: {
        precipitationRegion: '.compare-precipitation',
    },

    modelEvents: {
        'change:polling': 'toggleDownloadButtonActive'
    },

    templateHelpers: function() {
        return {
            showDownloadButton: this.model.get('modelPackage') === coreUtils.TR55_PACKAGE,
        };
    },

    toggleDownloadButtonActive: function() {
        this.ui.downloadButton.prop('disabled', this.model.get('polling'));
    },

    onShow: function() {
        var addOrReplaceInput = _.bind(this.model.addOrReplaceInput, this.model),
            controlModel = this.model.get('scenarios')
                               .findWhere({ active: true })
                               .get('inputs')
                               .findWhere({ name: 'precipitation' }),
            precipitationModel = this.model.get('controls')
                                     .findWhere({ name: 'precipitation' }),
            showPrecipitationSlider = controlModel && precipitationModel;

        if (showPrecipitationSlider) {
            this.precipitationRegion.show(new PrecipitationView({
                model: precipitationModel,
                controlModel: controlModel,
                addOrReplaceInput: addOrReplaceInput,
            }));
        }
    },

    setChartView: function() {
        this.ui.chartButton.addClass('active');
        this.ui.tableButton.removeClass('active');
        this.model.set({ mode: constants.CHARTS });
    },

    setTableView: function() {
        this.ui.chartButton.removeClass('active');
        this.ui.tableButton.addClass('active');
        this.model.set({ mode: constants.TABLE });
    },

    downloadCSV: function() {
        var scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            massPerAreaUnit = coreUnits[scheme].MASSPERAREA_M.name,
            getLength = function(value) {
                return coreUnits.get('LENGTH_S', value / 100).value;
            },
            getMassPerArea = function(value) {
                return coreUnits.get('MASSPERAREA_M', value).value;
            },
            aoi = App.currentProject.get('area_of_interest'),
            aoiVolumeModel = new tr55Models.AoiVolumeModel({ areaOfInterest: aoi }),
            csvHeadings = [[
                'scenario_name',
                'precipitation_' + lengthUnit,
                'runoff_' + lengthUnit,
                'evapotranspiration_' + lengthUnit,
                'infiltration_' + lengthUnit,
                'tss_load_' + lengthUnit,
                'tss_runoff_' + lengthUnit,
                'tss_loading_rate_' + massPerAreaUnit,
                'tn_load_' + lengthUnit,
                'tn_runoff_' + lengthUnit,
                'tn_loading_rate_' + massPerAreaUnit,
                'tp_load_' + lengthUnit,
                'tp_runoff_' + lengthUnit,
                'tp_loading_rate_' + massPerAreaUnit
            ]],
            precipitation = this.model.get('scenarios')
                .findWhere({ active: true })
                .get('inputs')
                .findWhere({ name: 'precipitation' })
                .get('value'),
            precipitationMeters = precipitation * coreUnits.CONVERSIONS.CM_PER_IN / 100,
            csvData = this.model.get('scenarios')
                .map(function(scenario) {
                    var result = scenario
                            .get('results')
                            .findWhere({ name: 'runoff' })
                            .get('result'),
                        isPreColumbian = scenario.get('is_pre_columbian') || false,
                        isCurrentConditions = scenario.get('is_current_conditions'),
                        runoff,
                        quality,
                        tss,
                        tn,
                        tp;

                    if (isPreColumbian) {
                        runoff = result.runoff.pc_unmodified;
                        quality = result.quality.pc_unmodified;
                    } else if (isCurrentConditions) {
                        runoff = result.runoff.unmodified;
                        quality = result.quality.unmodified;
                    } else {
                        runoff = result.runoff.modified;
                        quality = result.quality.modified;
                    }

                    tss = quality[0];
                    tn = quality[1];
                    tp = quality[2];

                    return [
                        scenario.get('name'),
                        getLength(precipitationMeters).toFixed(2),
                        getLength(runoff.runoff),
                        getLength(runoff.et),
                        getLength(runoff.inf),
                        getLength(tss.load),
                        getLength(tss.runoff),
                        getMassPerArea(aoiVolumeModel.getLoadingRate(tss.load)),
                        getLength(tn.load),
                        getLength(tn.runoff),
                        getMassPerArea(aoiVolumeModel.getLoadingRate(tn.load)),
                        getLength(tp.load),
                        getLength(tp.runoff),
                        getMassPerArea(aoiVolumeModel.getLoadingRate(tp.load)),
                    ];
                }),
            csv = csvHeadings
                .concat(csvData)
                .map(function (data) {
                    return data.join(', ');
                })
                .join('\n'),
            projectName = this.model.get('projectName'),
            timeStamp = moment().format('MMDDYYYYHHmmss'),
            fileName = projectName.replace(/[^a-z0-9+]+/gi, '_') + '_' +
                timeStamp + '.csv';

        coreUtils.downloadText(csv, fileName);
    }
});

var SelectionView = Marionette.ItemView.extend({
    // model: TabModel
    template: compareSelectionTmpl,
    tagName: 'select',
    className: 'form-control btn btn-small btn-primary',

    events: {
        'change': 'select',
    },

    templateHelpers: function() {
        var groups = [];

        this.model.get('selections').forEach(function(opt) {
            var group = _.find(groups, { name: opt.get('groupName') });

            if (group === undefined) {
                group = { name: opt.get('groupName'), options: [] };
                groups.push(group);
            }

            group.options.push({
                name: opt.get('name'),
                active: opt.get('active'),
                value: opt.get('value'),
            });
        });

        return {
            groups: groups,
        };
    },

    select: function() {
        var selections = this.model.get('selections');
        var newValue = this.$el.val();

        selections
            .invoke('set', { active: false }, { silent: true });

        selections
            .findWhere({ value: newValue })
            .set({ active: true });
    }
});

var CompareModificationsPopoverView = Marionette.ItemView.extend({
    // model: ModificationsCollection
    template: compareModificationsPopoverTmpl,

    templateHelpers: function() {
        var isTr55 = App.currentProject.get('model_package') ===
                     coreUtils.TR55_PACKAGE,
            scheme = settings.get('unit_scheme'),
            gwlfeModifications = isTr55 ? [] : _.flatten(
                this.model.map(function(m) {
                    return _.map(m.get('userInput'), function(value, key) {
                        var unit = gwlfeConfig.displayUnits[key],
                            areaUnit = unit && coreUnits[scheme][unit].name,
                            modKey = m.get('modKey'),
                            name = modKey,
                            input = gwlfeConfig.displayNames[key] || key;

                        if (modKey === 'entry_landcover') {
                            name = _.find(GWLFE_LAND_COVERS, { id: parseInt(key.substring(6)) }).label;
                            input = coreUnits[scheme].AREA_L_FROM_HA.name;
                        } else if (modKey === 'entry_landcover_preset') {
                            var task = App.getAnalyzeCollection()
                                          .findWhere({ name: 'land' })
                                          .get('tasks')
                                          .findWhere({ name: value });

                            if (!task) {
                                console.error('Unknown entry_landcover_preset: ' + value);
                            }

                            name = 'Land Cover Preset';
                            value = null;
                            input = task && task.get('displayName');
                        } else {
                            input = input.replace('AREAUNITNAME', areaUnit);
                        }

                        return {
                            name: name,
                            value: value,
                            input: input,
                        };
                    });
                })
            );

        return {
            isTr55: isTr55,
            gwlfeModifications: gwlfeModifications,
            conservationPractices: this.model.filter(function(modification) {
                return modification.get('name') === 'conservation_practice';
            }),
            landCovers: this.model.filter(function(modification) {
                return modification.get('name') === 'landcover';
            }),
            modConfigUtils: modConfigUtils
        };
    }
});

var CompareDescriptionPopoverView = Marionette.ItemView.extend({
    // model: ScenarioModel
    template: compareDescriptionPopoverTmpl,
    className: 'compare-no-mods-popover',

    templateHelpers: function() {
        return {
            isTr55: App.currentProject.get('model_package') ===
                    coreUtils.TR55_PACKAGE,
        };
    },
});

var GwlfeScenarioItemView = Marionette.ItemView.extend({
    className: 'compare-column -gwlfe',
    template: gwlfeCompareScenarioItemTmpl,

    attributes: {
        'data-html': 'true',
        'data-toggle': 'popover',
    },

    onRender: function() {
        var modifications = this.model.get('modifications'),
            popOverView = modifications.length > 0 ?
                new CompareModificationsPopoverView({
                    model: modifications
                }) :
                new CompareDescriptionPopoverView({
                    model: this.model
                });

        var popOverEl = popOverView.render().el;

        this.$el.popover({
            placement: 'bottom',
            trigger: 'hover focus',
            content: popOverEl
        });
    },
});

var Tr55ScenarioItemView = Marionette.ItemView.extend({
    className: 'compare-column -tr55',
    template: tr55CompareScenarioItemTmpl,

    ui: {
        'mapContainer': '.compare-map-container',
    },

    onShow: function() {
        var mapView = new coreViews.MapView({
            model: new coreModels.MapModel({
                'areaOfInterest': App.currentProject.get('area_of_interest'),
                'areaOfInterestName': App.currentProject.get('area_of_interest_name'),
            }),
            el: this.ui.mapContainer,
            addZoomControl: false,
            addFitToAoiControl: false,
            addLocateMeButton: false,
            addSidebarToggleControl: false,
            showLayerAttribution: false,
            initialLayerName: App.getLayerTabCollection().getCurrentActiveBaseLayerName(),
            layerTabCollection: new coreModels.LayerTabCollection(),
            interactiveMode: false,
        });
        mapView.updateAreaOfInterest();
        mapView.updateModifications(this.model);
        mapView.fitToModificationsOrAoi();
        mapView.render();
    },

    onRender: function() {
        var modifications = this.model.get('modifications'),
            popOverView = modifications.length > 0 ?
                              new CompareModificationsPopoverView({
                                  model: modifications
                              }) :
                              new CompareDescriptionPopoverView({
                                  model: this.model
                              });

        this.ui.mapContainer.popover({
            placement: 'bottom',
            trigger: 'hover focus',
            content: popOverView.render().el
        });
    }
});

var ScenariosRowView = Marionette.CollectionView.extend({
    className: 'compare-scenario-row-content',
    getChildView: function() {
        if (this.model.get('modelPackage') === coreUtils.TR55_PACKAGE) {
            return Tr55ScenarioItemView;
        } else {
            return GwlfeScenarioItemView;
        }
    },

    modelEvents: {
        'change:visibleScenarioIndex': 'slide',
    },

    slide: function() {
        var i = this.model.get('visibleScenarioIndex'),
            width = constants.COMPARE_COLUMN_WIDTH,
            marginLeft = -i * width;

        this.$el.css({
            'margin-left': marginLeft + 'px',
        });
    }
});

var Tr55BarChartRowView = Marionette.ItemView.extend({
    model: models.BarChartRowModel,
    className: 'compare-chart-row',
    template: compareBarChartRowTmpl,

    modelEvents: {
        'change:values': 'renderChart',
    },

    onAttach: function() {
        this.renderChart();
    },

    renderChart: function() {
        var self = this,
            scheme = settings.get('unit_scheme'),
            unit = this.model.get('unit'),
            chartDiv = this.model.get('chartDiv'),
            chartEl = document.getElementById(chartDiv),
            name = this.model.get('name'),
            chartName = name.replace(/\s/g, ''),
            label = this.model.get('unitLabel') +
                    ' (' + coreUnits[scheme][unit].name + ')',
            colors = this.model.get('seriesColors'),
            stacked = name.indexOf('Hydrology') > -1,
            precipitation = this.model.get('precipitation'),
            yMax = stacked ?
                    coreUnits.get(unit, precipitation).value :
                    null,
            values = this.model.get('values'),
            data = stacked ? ['inf', 'runoff', 'et'].map(function(key) {
                    return {
                        key: key,
                        values: values.map(function(value, index) {
                            return {
                                x: 'Series ' + index,
                                y: coreUnits.get(unit, value[key] / 100).value,
                            };
                        })
                    };
                }) : [{
                    key: name,
                    values: values.map(function(value, index) {
                        return {
                            x: 'Series ' + index,
                            y: coreUnits.get(unit, value).value,
                        };
                    }),
                }],
            onRenderComplete = function() {
                self.triggerMethod('chart:rendered');
            };

        $(chartEl.parentNode).css({ 'width': ((_.size(this.model.get('values')) * constants.COMPARE_COLUMN_WIDTH + constants.CHART_AXIS_WIDTH)  + 'px') });
        chart.renderCompareMultibarChart(
            chartEl, chartName, label, colors, stacked, yMax, data,
            constants.COMPARE_COLUMN_WIDTH, constants.CHART_AXIS_WIDTH, onRenderComplete);
    },
});

var LineChartRowView = Marionette.ItemView.extend({
    models: models.LineChartRowModel,
    className: 'compare-chart-row -line',
    template: compareLineChartRowTmpl,

    modelEvents: {
        'change:values': 'renderChart',
    },

    onAttach: function() {
        this.renderChart();
    },

    renderChart: function() {
        var self = this,
            scheme = settings.get('unit_scheme'),
            lengthUnit = coreUnits[scheme].LENGTH_S.name,
            chartDiv = this.model.get('chartDiv'),
            chartEl = document.getElementById(chartDiv),
            data = this.model.get('data')
                .map(function(scenarioData, index) {
                    return {
                        key: index,
                        values: scenarioData.map(function(val, x) {
                            return {
                                x: x,
                                y: coreUnits.get('LENGTH_S', Number(val) / 100).value,
                            };
                        }),
                        color: constants.SCENARIO_COLORS[index % 32],
                    };
                })
                .slice()
                .reverse(),
            options = {
                yAxisLabel: 'Water Depth (' + lengthUnit + ')',
                yAxisUnit: lengthUnit,
                xAxisLabel: function(xValue) {
                    return constants.monthNames[xValue];
                },
                xTickValues: _.range(12),
                onRenderComplete: function() {
                    self.triggerMethod('chart:rendered');
                },
            },
            scenarioNames = this.model.get('scenarioNames'),
            tooltipKeyFormatFn = function(d) {
                return scenarioNames[d];
            };

        chart.renderLineChart(chartEl, data, options, tooltipKeyFormatFn);
    },
});

var GwlfeHydrologyChartView = Marionette.CollectionView.extend({
    childView: LineChartRowView,
});

var GwlfeBarChartRowView = Marionette.ItemView.extend({
    className: 'compare-chart-row',
    template: compareBarChartRowTmpl,

    modelEvents: {
        'change:values': 'renderChart',
    },

    onAttach: function() {
        this.renderChart();
    },

    renderChart: function() {
        var self = this,
            chartDiv = this.model.get('chartDiv'),
            chartEl = document.getElementById(chartDiv),
            chartName = this.model.get('key'),
            values = this.model.get('values'),
            data = [{
                key: chartName,
                values: values,
            }],
            parentWidth = (_.size(values) *
                constants.COMPARE_COLUMN_WIDTH +
                constants.CHART_AXIS_WIDTH) + 'px',
            yAxisUnit = this.model.get('unit'),
            yAxisLabel = this.model.get('unitLabel') + ' (' + yAxisUnit + ')',
            options = {
                yAxisUnit: yAxisUnit,
                yAxisLabel: yAxisLabel,
                colors: constants.SCENARIO_COLORS,
                columnWidth: constants.COMPARE_COLUMN_WIDTH,
                xAxisWidth: constants.CHART_AXIS_WIDTH,
                onRenderComplete: function() {
                    self.triggerMethod('chart:rendered');
                },
                abbreviateTicks: true,
            };

        $(chartEl.parentNode).css({ width: parentWidth });
        chart.renderDiscreteBarChart(chartEl, data, options);
    },
});

var ChartView = Marionette.CollectionView.extend({
    modelEvents: {
        'change:visibleScenarioIndex': 'slide',
    },

    onRender: function() {
        // To initialize chart correctly when switching between tabs
        this.slide();
    },

    onChildviewChartRendered: function() {
        // Update chart status after it is rendered
        this.slide();
    },

    slide: function() {
        var i = this.model.get('visibleScenarioIndex'),
            width = constants.COMPARE_COLUMN_WIDTH,
            marginLeft = -i * width;

        // Slide charts
        this.$('.compare-scenario-row-content').css({
            'margin-left': marginLeft + 'px',
        });

        // Slide axis
        this.$('.nvd3.nv-wrap.nv-axis').css({
            'transform': 'translate(' + (-marginLeft) + 'px)',
        });

        // Slide clipPath so tooltips don't show outside charts
        // It doesn't matter too much what the y-translate is
        // so long as its sufficiently large
        this.$('defs > clipPath > rect').attr({
            'transform': 'translate(' + (-marginLeft) + ', -30)',
        });

        // Show charts from visibleScenarioIndex
        this.$('.nv-group > :nth-child(n + ' + (i+1) + ')').css({
            'opacity': '',
        });

        // Hide charts up to visibleScenarioIndex
        this.$('.nv-group > :nth-child(-n + ' + i + ')').css({
            'opacity': 0,
        });
    },
});

var Tr55ChartView = ChartView.extend({
    childView: Tr55BarChartRowView,
});

var GwlfeQualityChartView = ChartView.extend({
    childView: GwlfeBarChartRowView,
});

var TableRowView = Marionette.ItemView.extend({
    className: 'compare-table-row',
    template: compareTableRowTmpl,
});

var TableView = Marionette.CollectionView.extend({
    childView: TableRowView,
    collectionEvents: {
        'change': 'render',
    },

    modelEvents: {
        'change:visibleScenarioIndex': 'slide',
    },

    onRender: function() {
        // To initialize table correctly when switching between tabs,
        // and when receiving new values from server
        this.slide();
    },

    slide: function() {
        var i = this.model.get('visibleScenarioIndex'),
            width = constants.COMPARE_COLUMN_WIDTH,
            marginLeft = -i * width;

        this.$('.compare-scenario-row-content').css({
            'margin-left': marginLeft + 'px',
        });
    }
});

var GwlfeHydrologyTableRowView = TableRowView.extend({
    models: models.MonthlyTableRowModel,
    className: 'compare-table-row -hydrology',
    template: compareTableRowTmpl,

    templateHelpers: function() {
        var selectedAttribute = this.model.get('selectedAttribute'),
            scheme = settings.get('unit_scheme'),
            unit = this.model.get('unit');

        return {
            unit: coreUnits[scheme][unit].name,
            values: this.model
                .get('values')
                .map(function(v) {
                    return coreUnits.get(unit, v[selectedAttribute]).value;
                }),
        };
    },
});

var GwlfeHydrologyTableView = TableView.extend({
    childView: GwlfeHydrologyTableRowView,
});

var GwlfeQualityTableRowView = TableRowView.extend({
    className: 'compare-table-row -gwlfe -quality',

    templateHelpers: function() {
        var scheme = settings.get('unit_scheme'),
            unit = this.model.get('unit');

        if (!unit) {
            // Special header case
            return {};
        }

        return {
            unit: coreUnits[scheme][unit].name ,
            values: this.model.get('values').map(function(v) {
                return coreUnits.get(unit, v).value;
            }),
        };
    }
});

var GwlfeQualityTableView = TableView.extend({
    childView: GwlfeQualityTableRowView,
});

function getTr55Tabs(scenarios) {
    // TODO Account for loading and error scenarios
    var aoi = App.currentProject.get('area_of_interest'),
        aoiVolumeModel = new tr55Models.AoiVolumeModel({ areaOfInterest: aoi }),
        runoffTable = new models.Tr55RunoffTable({ scenarios: scenarios }),
        runoffCharts = new models.Tr55RunoffCharts(
            constants.tr55RunoffChartConfig,
            { scenarios: scenarios }
        ),
        qualityTable = new models.Tr55QualityTable({
            scenarios: scenarios,
            aoiVolumeModel: aoiVolumeModel,
        }),
        qualityCharts = new models.Tr55QualityCharts(
            constants.tr55QualityChartConfig,
            { scenarios: scenarios, aoiVolumeModel: aoiVolumeModel }
        );

    return new models.TabsCollection([
        {
            name: 'Runoff',
            table: runoffTable,
            charts: runoffCharts,
            active: true,
        },
        {
            name: 'Water Quality',
            table: qualityTable,
            charts: qualityCharts,
        },
    ]);
}

function getGwlfeTabs(scenarios) {
    var hydrologyTable = new models.GwlfeHydrologyTable(utils.mapScenariosToHydrologyTableData(scenarios)),
        scenarioNames = scenarios.map(function(s) {
            return s.get('name');
        }),
        hydrologyCharts = new models.GwlfeHydrologyCharts([
            {
                key: constants.hydrologyKeys.streamFlow,
                name: 'Stream Flow',
                chartDiv: 'hydrology-stream-flow-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.streamFlow),
                scenarioNames: scenarioNames,
            },
            {
                key: constants.hydrologyKeys.surfaceRunoff,
                name: 'Surface Runoff',
                chartDiv: 'hydrology-surface-runoff-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.surfaceRunoff),
                scenarioNames: scenarioNames,
            },
            {
                key: constants.hydrologyKeys.subsurfaceFlow,
                name: 'Subsurface Flow',
                chartDiv: 'hydrology-subsurface-flow-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.subsurfaceFlow),
                scenarioNames: scenarioNames,
            },
            {
                key: constants.hydrologyKeys.pointSourceFlow,
                name: 'Point Source Flow',
                chartDiv: 'hydrology-point-source-flow-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.pointSourceFlow),
                scenarioNames: scenarioNames,
            },
            {
                key: constants.hydrologyKeys.evapotranspiration,
                name: 'Evapotranspiration',
                chartDiv: 'hydrology-evapotranspiration-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.evapotranspiration),
                scenarioNames: scenarioNames,
            },
            {
                key: constants.hydrologyKeys.precipitation,
                name: 'Precipitation',
                chartDiv: 'hydrology-precipitation-chart',
                data: utils.mapScenariosToHydrologyChartData(scenarios, constants.hydrologyKeys.precipitation),
                scenarioNames: scenarioNames,
            },
        ], { scenarios: scenarios }),
        hydrologySelections = new models.SelectionOptionsCollection(
            constants.gwlfeHydrologySelectionOptionConfig),
        qualityTable = new models.GwlfeQualityTable({
            scenarios: scenarios,
        }),
        qualityCharts = new models.GwlfeQualityCharts(
            constants.gwlfeQualityChartConfig,
            { scenarios: scenarios }
        ),
        qualitySelections = new models.SelectionOptionsCollection(
            utils.getQualitySelections(scenarios));

    return new models.TabsCollection([
        {
            name: 'Hydrology',
            table: hydrologyTable,
            charts: hydrologyCharts,
            active: true,
            selections: hydrologySelections,
        },
        {
            name: 'Water Quality',
            table: qualityTable,
            charts: qualityCharts,
            selections: qualitySelections,
        },
    ]);
}

function copyScenario(scenario, aoi_census, color) {
    var newScenario = new modelingModels.ScenarioModel({}),
        fetchResults = _.bind(newScenario.fetchResults, newScenario),
        debouncedFetchResults = _.debounce(fetchResults, 500);

    newScenario.set({
        name: scenario.get('name'),
        is_current_conditions: scenario.get('is_current_conditions'),
        aoi_census: aoi_census,
        modifications: scenario.get('modifications'),
        modification_hash: scenario.get('modification_hash'),
        modification_censuses: scenario.get('modification_censuses'),
        results: new modelingModels.ResultCollection(scenario.get('results').toJSON()),
        inputs: new modelingModels.ModificationsCollection(scenario.get('inputs').toJSON()),
        inputmod_hash: scenario.get('inputmod_hash'),
        allow_save: false,
        active: scenario.get('active'),
        color: color,
    });

    newScenario.get('inputs').on('add', debouncedFetchResults);

    return newScenario;
}

// Makes a sandboxed copy of project scenarios which can be safely
// edited and experimented in the Compare Window, and discarded on close.
function getCompareScenarios(isTr55) {
    var trueScenarios = App.currentProject.get('scenarios'),
        tempScenarios = new modelingModels.ScenariosCollection(),
        ccScenario = trueScenarios.findWhere({ is_current_conditions: true }),
        aoi_census = ccScenario.get('aoi_census');

    if (isTr55) {
        // Add Predominantly Forested scenario
        var forestScenario = copyScenario(ccScenario, aoi_census);

        forestScenario.set({
            name: 'Predominantly Forested',
            is_current_conditions: false,
            is_pre_columbian: true,
        });

        tempScenarios.add(forestScenario);
    }

    trueScenarios.forEach(function(scenario, index) {
        var color = constants.SCENARIO_COLORS[index % 32];
        tempScenarios.add(copyScenario(scenario, aoi_census, color));
    });

    return tempScenarios;
}

function showCompare() {
    var model_package = App.currentProject.get('model_package'),
        projectName = App.currentProject.get('name'),
        isTr55 = model_package === coreUtils.TR55_PACKAGE,
        scenarios = getCompareScenarios(isTr55),
        tabs = isTr55 ? getTr55Tabs(scenarios) : getGwlfeTabs(scenarios),
        controlsJson = isTr55 ? [{ name: 'precipitation' }] : [],
        controls = new models.ControlsCollection(controlsJson),
        compareModel = new models.WindowModel({
            controls: controls,
            tabs: tabs,
            scenarios: scenarios,
            projectName: projectName,
            modelPackage: model_package,
        });

    if (isTr55) {
        // Set compare model to have same precipitation as active scenario
        compareModel.addOrReplaceInput(
            scenarios.findWhere({ active: true })
                     .get('inputs')
                     .findWhere({ name: 'precipitation' }));
    }

    App.rootView.compareRegion.show(new CompareModal({
        model: compareModel,
    }));
}

module.exports = {
    showCompare: showCompare,
    CompareModal: CompareModal,
    getTr55Tabs: getTr55Tabs
};
