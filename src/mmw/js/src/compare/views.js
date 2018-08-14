"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    moment = require('moment'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    coreModels = require('../core/models'),
    coreUtils = require('../core/utils'),
    coreViews = require('../core/views'),
    chart = require('../core/chart.js'),
    modalViews = require('../core/modals/views'),
    models = require('./models'),
    modelingModels = require('../modeling/models'),
    modelingViews = require('../modeling/views'),
    tr55Models = require('../modeling/tr55/models'),
    PrecipitationView = require('../modeling/controls').PrecipitationView,
    modConfigUtils = require('../modeling/modificationConfigUtils'),
    compareWindowTmpl = require('./templates/compareWindow.html'),
    compareWindow2Tmpl = require('./templates/compareWindow2.html'),
    compareTabPanelTmpl = require('./templates/compareTabPanel.html'),
    compareInputsTmpl = require('./templates/compareInputs.html'),
    compareSelectionTmpl = require('./templates/compareSelection.html'),
    tr55CompareScenarioItemTmpl = require('./templates/tr55CompareScenarioItem.html'),
    gwlfeCompareScenarioItemTmpl = require('./templates/gwlfeCompareScenarioItem.html'),
    compareBarChartRowTmpl = require('./templates/compareBarChartRow.html'),
    compareLineChartRowTmpl = require('./templates/compareLineChartRow.html'),
    compareTableRowTmpl = require('./templates/compareTableRow.html'),
    compareScenariosTmpl = require('./templates/compareScenarios.html'),
    compareScenarioTmpl = require('./templates/compareScenario.html'),
    compareModelingTmpl = require('./templates/compareModeling.html'),
    compareModificationsTmpl = require('./templates/compareModifications.html'),
    compareModificationsPopoverTmpl = require('./templates/compareModificationsPopover.html'),
    compareDescriptionPopoverTmpl = require('./templates/compareDescriptionPopover.html');

var SCENARIO_COLORS =  ['#3366cc','#dc3912','#ff9900','#109618','#990099',
        '#0099c6','#dd4477', '#66aa00','#b82e2e','#316395','#3366cc','#994499',
        '#22aa99','#aaaa11', '#6633cc','#e67300','#8b0707','#651067','#329262',
        '#5574a6','#3b3eac', '#b77322','#16d620','#b91383','#f4359e','#9c5935',
        '#a9c413','#2a778d', '#668d1c','#bea413','#0c5922','#743411'];

var CompareWindow2 = modalViews.ModalBaseView.extend({
    template: compareWindow2Tmpl,

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
        });
    },

    highlightButtons: function() {
        var i = this.model.get('visibleScenarioIndex'),
            total = this.model.get('scenarios').length,
            minScenarios = models.constants.MIN_VISIBLE_SCENARIOS,
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

        showSectionsView();
        this.highlightButtons();
    },

    showSectionsView: function() {
        var activeTab = this.model.get('tabs').findWhere({ active: true });

        switch (this.model.get('modelPackage')) {
            case coreUtils.GWLFE:
                this.showGWLFESectionsView();
                this.showSelectionView(activeTab);
                break;
            case coreUtils.TR55_PACKAGE:
                this.showTR55SectionsView();
                break;
            default:
                window.console.warn('Invalid model package', this.model.get('modelPackage'));
                break;
        }
    },

    showTR55SectionsView: function() {
        if (this.model.get('mode') === models.constants.CHART) {
            this.sectionsRegion.show(new TR55ChartView({
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

    showGWLFESectionsView: function() {
        if (this.model.get('mode') === models.constants.CHART) {
            var activeCollection = this.model.get('tabs').findWhere({ active: true });

            if (activeCollection.get('name') === models.constants.HYDROLOGY) {
                this.sectionsRegion.show(new GWLFEHydrologyChartView({
                    model: this.model,
                    collection: activeCollection.get('charts'),
                }));
            } else {
                window.console.warn('TODO: Implement GWLFE Water Quality Chart');
            }
        } else {
            window.console.warn('TODO: Implement GWLFE Table');
        }
    },

    showSelectionView: function(activeTab) {
        var isHydrologyChart =
                this.model.get('mode') === models.constants.CHART &&
                activeTab.get('name') === models.constants.HYDROLOGY;

        var demoFunction = function() {
            var selected =
                activeTab.get('selections').findWhere({ active: true });

            console.log(
                selected.get('group') + ' ' + selected.get('name'));
        };

        // TODO Remove demo listener
        this.model.get('tabs').forEach(function(tab) {
            var selections = tab.get('selections');

            if (selections) {
                selections.off();
            }
        });

        if (activeTab.get('selections') && !isHydrologyChart) {
            this.selectionRegion.show(new SelectionView({
                model: activeTab,
            }));

            // TODO Demo Listening for Changes
            activeTab.get('selections').on('change', demoFunction);
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
                               models.constants.MIN_VISIBLE_SCENARIOS);

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
        this.model.set({ mode: models.constants.CHART });
    },

    setTableView: function() {
        this.ui.chartButton.removeClass('active');
        this.ui.tableButton.addClass('active');
        this.model.set({ mode: models.constants.TABLE });
    },

    downloadCSV: function() {
        var aoi = App.currentProject.get('area_of_interest'),
            aoiVolumeModel = new tr55Models.AoiVolumeModel({ areaOfInterest: aoi }),
            csvHeadings = [['scenario_name', 'precipitation_cm', 'runoff_cm',
                'evapotranspiration_cm', 'infiltration_cm', 'tss_load_cm', 'tss_runoff_cm',
                'tss_loading_rate_kgha', 'tn_load_cm', 'tn_runoff_cm', 'tn_loading_rate_kgha',
                'tp_load_cm', 'tp_runoff_cm', 'tp_loading_rate_kgha']],
            precipitation = this.model.get('scenarios')
                .findWhere({ active: true })
                .get('inputs')
                .findWhere({ name: 'precipitation' })
                .get('value'),
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
                        coreUtils.convertToMetric(precipitation, 'in').toFixed(2),
                        runoff.runoff,
                        runoff.et,
                        runoff.inf,
                        tss.load,
                        tss.runoff,
                        aoiVolumeModel.getLoadingRate(tss.load),
                        tn.load,
                        tn.runoff,
                        aoiVolumeModel.getLoadingRate(tn.load),
                        tp.load,
                        tp.runoff,
                        aoiVolumeModel.getLoadingRate(tp.load),
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

        coreUtils.downloadAsFile(csv, fileName);
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
            var group = _.find(groups, { name: opt.get('group') });

            if (group === undefined) {
                group = { name: opt.get('group'), options: [] };
                groups.push(group);
            }

            group.options.push({
                name: opt.get('name'),
                active: opt.get('active'),
            });
        });

        return {
            groups: groups,
        };
    },

    select: function() {
        var selections = this.model.get('selections');

        selections
            .findWhere({ active: true })
            .set({ active: false }, { silent: true });

        selections
            .findWhere({ value: this.$el.val() })
            .set({ active: true });
    }
});

var CompareModificationsPopoverView = Marionette.ItemView.extend({
    // model: ModificationsCollection
    template: compareModificationsPopoverTmpl,

    templateHelpers: function() {
        return {
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
    className: 'compare-no-mods-popover'
});

var GWLFEScenarioItemView = Marionette.ItemView.extend({
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

var TR55ScenarioItemView = Marionette.ItemView.extend({
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
            return TR55ScenarioItemView;
        } else {
            return GWLFEScenarioItemView;
        }
    },

    modelEvents: {
        'change:visibleScenarioIndex': 'slide',
    },

    slide: function() {
        var i = this.model.get('visibleScenarioIndex'),
            width = models.constants.COMPARE_COLUMN_WIDTH,
            marginLeft = -i * width;

        this.$el.css({
            'margin-left': marginLeft + 'px',
        });
    }
});

var BarChartRowView = Marionette.ItemView.extend({
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
            chartDiv = this.model.get('chartDiv'),
            chartEl = document.getElementById(chartDiv),
            name = this.model.get('name'),
            chartName = name.replace(/\s/g, ''),
            label = this.model.get('unitLabel') +
                    ' (' + this.model.get('unit') + ')',
            colors = this.model.get('seriesColors'),
            stacked = name.indexOf('Hydrology') > -1,
            yMax = stacked ? this.model.get('precipitation') : null,
            values = this.model.get('values'),
            data = stacked ? ['inf', 'runoff', 'et'].map(function(key) {
                    return {
                        key: key,
                        values: values.map(function(value, index) {
                            return {
                                x: 'Series ' + index,
                                y: value[key],
                            };
                        })
                    };
                }) : [{
                    key: name,
                    values: values.map(function(value, index) {
                        return {
                            x: 'Series ' + index,
                            y: value,
                        };
                    }),
                }],
            onRenderComplete = function() {
                self.triggerMethod('chart:rendered');
            };

        $(chartEl.parentNode).css({ 'width': ((_.size(this.model.get('values')) * models.constants.COMPARE_COLUMN_WIDTH + models.constants.CHART_AXIS_WIDTH)  + 'px') });
        chart.renderCompareMultibarChart(
            chartEl, chartName, label, colors, stacked, yMax, data,
            models.constants.COMPARE_COLUMN_WIDTH, models.constants.CHART_AXIS_WIDTH, onRenderComplete);
    },
});

var LineChartRowView = Marionette.ItemView.extend({
    models: models.LineChartRowModel,
    className: 'compare-chart-row -line',
    template: compareLineChartRowTmpl,
});

var GWLFEHydrologyChartView = Marionette.CollectionView.extend({
    childView: LineChartRowView,

    onShow: function() {
        window.console.log('TODO Implement GWLFE Hydrology chart');
    }
});

var TR55ChartView = Marionette.CollectionView.extend({
    childView: BarChartRowView,

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
            width = models.constants.COMPARE_COLUMN_WIDTH,
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
        this.$('.nv-group > rect:nth-child(n + ' + (i+1) + ')').css({
            'opacity': '',
        });

        // Hide charts up to visibleScenarioIndex
        this.$('.nv-group > rect:nth-child(-n + ' + i + ')').css({
            'opacity': 0,
        });
    },
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
            width = models.constants.COMPARE_COLUMN_WIDTH,
            marginLeft = -i * width;

        this.$('.compare-scenario-row-content').css({
            'margin-left': marginLeft + 'px',
        });
    }
});

var CompareWindow = Marionette.LayoutView.extend({
    //model: modelingModels.ProjectModel,

    template: compareWindowTmpl,

    id: 'compare-window',

    regions: {
        containerRegion: '#compare-scenarios-region'
    },

    ui: {
        'slideLeft': '#slide-left',
        'slideRight': '#slide-right'
    },

    events: {
        'click @ui.slideLeft': 'slideLeft',
        'click @ui.slideRight': 'slideRight'
    },

    initialize: function() {
        // Left-most visible scenario
        this.slideInd = 0;

        // Resizing the window can change the column size,
        // so the offset of the container needs to be
        // recomputed.
        $(window).on('resize.app', _.debounce(_.bind(this.updateContainerPos, this)));
    },

    onDestroy: function() {
        $(window).off('resize.app');
    },

    getColumnWidth: function() {
        // Width is a function of screen size.
        return parseInt($('#compare-row td').css('width'));
    },

    getContainerWidth: function() {
        // Width is a function of screen size.
        return parseInt($('body').get(0).offsetWidth);
    },

    updateContainerPos: function() {
        var left = -1 * this.slideInd * this.getColumnWidth();
        $('.compare-scenarios-container').css('left', left + 'px');
    },

    slideLeft: function() {
        if (this.slideInd > 0) {
            this.slideInd--;
            this.updateContainerPos();
        }
    },

    slideRight: function() {
        var numScenarios = this.model.get('scenarios').length,
            maxVisColumns = Math.floor(this.getContainerWidth() / this.getColumnWidth());

        if (this.slideInd < numScenarios - maxVisColumns) {
            this.slideInd++;
            this.updateContainerPos();
        }
    },

    onShow: function() {
         this.containerRegion.show(new CompareScenariosView({
            model: this.model,
            collection: this.model.get('scenarios')
         }));
    }
});

var CompareScenarioView = Marionette.LayoutView.extend({
    //model: modelingModels.ScenarioModel,

    tagName: 'td',

    template: compareScenarioTmpl,

    templateHelpers: function() {
        return {
            scenarioName: this.model.get('name')
        };
    },

    regions: {
        mapRegion: '.map-region',
        modelingRegion: '.modeling-region',
        modificationsRegion: '.modifications-region'
    },

    initialize: function(options) {
        this.projectModel = options.projectModel;
        this.scenariosView = options.scenariosView;
    },

    onShow: function() {
        this.mapModel = new coreModels.MapModel({});
        this.LayerTabCollection = new coreModels.LayerTabCollection();
        this.mapModel.set({
            'areaOfInterest': this.projectModel.get('area_of_interest'),
            'areaOfInterestName': this.projectModel.get('area_of_interest_name')
        });
        this.mapView = new coreViews.MapView({
            model: this.mapModel,
            el: $(this.el).find('.map-container').get(),
            addZoomControl: false,
            addLocateMeButton: false,
            addSidebarToggleControl: false,
            showLayerAttribution: false,
            initialLayerName: App.getLayerTabCollection().getCurrentActiveBaseLayerName(),
            layerTabCollection: this.LayerTabCollection,
            interactiveMode: false
        });

        this.mapView.fitToAoi();
        this.mapView.updateAreaOfInterest();
        this.mapView.updateModifications(this.model);
        this.mapRegion.show(this.mapView);
        this.modelingRegion.show(new CompareModelingView({
            projectModel: this.projectModel,
            scenariosView: this.scenariosView,
            model: this.model
        }));

        this.modificationsRegion.show(new CompareModificationsView({
            model: this.model.get('modifications')
        }));
    }
});

var CompareScenariosView = Marionette.CompositeView.extend({
    //model: modelingModels.ProjectModel,
    //collection: modelingModels.ScenariosCollection,

    className: 'compare-scenarios-container',

    template: compareScenariosTmpl,

    childViewContainer: '#compare-row',
    childView: CompareScenarioView,
    childViewOptions: function() {
        return {
            scenariosView: this,
            projectModel: this.model
        };
    },

    initialize: function() {
        this.modelingViews = [];
    }
});

var CompareModelingView = Marionette.LayoutView.extend({
    //model: modelingModels.ScenarioModel

    template: compareModelingTmpl,

    className: 'modeling-container',

    regions: {
        resultRegion: '.result-region',
        controlsRegion: '.controls-region'
    },

    ui: {
        resultSelector: 'select'
    },

    events: {
        'change @ui.resultSelector': 'updateResult'
    },

    initialize: function(options) {
        this.projectModel = options.projectModel;
        this.model.get('results').makeFirstActive();
        this.listenTo(this.model.get('results').at(0), 'change:polling', function() {
            this.render();
            this.onShow();
        });
        this.scenariosView = options.scenariosView;
        this.scenariosView.modelingViews.push(this);
    },

    templateHelpers: function() {
        return {
            polling: this.model.get('results').at(0).get('polling'),
            results: this.model.get('results').toJSON()
        };
    },

    updateResult: function() {
        var selection = this.ui.resultSelector.val();

        this.model.get('results').setActive(selection);
        this.showResult();

        _.forEach(this.scenariosView.modelingViews, function(sibling) {
            if (sibling.ui.resultSelector.val() === selection) {
                return;
            } else {
                sibling.ui.resultSelector.val(selection);
                sibling.model.get('results').setActive(selection);
                sibling.showResult();
            }
        });

    },

    showResult: function() {
        var modelPackage = App.currentProject.get('model_package'),
            resultModel = this.model.get('results').getActive(),
            ResultView = modelingViews.getResultView(modelPackage, resultModel.get('name'));

        this.resultRegion.show(new ResultView({
            areaOfInterest: this.projectModel.get('area_of_interest'),
            model: resultModel,
            scenario: this.model,
            compareMode: true
        }));
    },

    showControls: function() {
        var controls = modelingModels.getControlsForModelPackage(
            this.projectModel.get('model_package'),
            {compareMode: true}
        );

        // TODO this needs to be generalized if we want the compare view
        // to work with GWLF-E
        this.controlsRegion.show(new modelingViews.Tr55ToolbarView({
            model: this.model,
            collection: controls,
            compareMode: true
        }));
    },

    onShow: function() {
        this.showResult();
        this.showControls();
    }
});

var CompareModificationsView = Marionette.ItemView.extend({
    //model: modelingModels.ModificationsCollection,
    template: compareModificationsTmpl,

    className: 'modifications-container',

    templateHelpers: function() {
        return {
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

function getTr55Tabs(scenarios) {
    // TODO Account for loading and error scenarios
    var aoi = App.currentProject.get('area_of_interest'),
        aoiVolumeModel = new tr55Models.AoiVolumeModel({ areaOfInterest: aoi }),
        runoffTable = new models.Tr55RunoffTable({ scenarios: scenarios }),
        runoffCharts = new models.Tr55RunoffCharts([
            {
                key: 'combined',
                name: 'Combined Hydrology',
                chartDiv: 'combined-hydrology-chart',
                seriesColors: ['#F8AA00', '#CF4300', '#C2D33C'],
                legendItems: [
                    {
                        name: 'Evapotranspiration',
                        badgeId: 'evapotranspiration-badge',
                    },
                    {
                        name: 'Runoff',
                        badgeId: 'runoff-badge',
                    },
                    {
                        name: 'Infiltration',
                        badgeId: 'infiltration-badge',
                    },
                ],
                unit: 'cm',
                unitLabel: 'Level',
            },
            {
                key: 'et',
                name: 'Evapotranspiration',
                chartDiv: 'evapotranspiration-chart',
                seriesColors: ['#C2D33C'],
                legendItems: null,
                unit: 'cm',
                unitLabel: 'Level',
            },
            {
                key: 'runoff',
                name: 'Runoff',
                chartDiv: 'runoff-chart',
                seriesColors: ['#CF4300'],
                legendItems: null,
                unit: 'cm',
                unitLabel: 'Level',
            },
            {
                key: 'inf',
                name: 'Infiltration',
                chartDiv: 'infiltration-chart',
                seriesColors: ['#F8AA00'],
                legendItems: null,
                unit: 'cm',
                unitLabel: 'Level',
            }
        ], { scenarios: scenarios }),
        qualityTable = new models.Tr55QualityTable({
            scenarios: scenarios,
            aoiVolumeModel: aoiVolumeModel,
        }),
        qualityCharts = new models.Tr55QualityCharts([
            {
                name: 'Total Suspended Solids',
                chartDiv: 'tss-chart',
                seriesColors: ['#389b9b'],
                legendItems: null,
                unit: 'kg/ha',
                unitLabel: 'Loading Rate',
            },
            {
                name: 'Total Nitrogen',
                chartDiv: 'tn-chart',
                seriesColors: ['#389b9b'],
                legendItems: null,
                unit: 'kg/ha',
                unitLabel: 'Loading Rate',
            },
            {
                name: 'Total Phosphorus',
                chartDiv: 'tp-chart',
                seriesColors: ['#389b9b'],
                legendItems: null,
                unit: 'kg/ha',
                unitLabel: 'Loading Rate',
            }
        ], { scenarios: scenarios, aoiVolumeModel: aoiVolumeModel });

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
    // TODO Implement
    var hydrologyTable = [],
        hydrologyCharts = new models.GwlfeHydrologyCharts([
            {
                key: 'AvStreamFlow',
                name: 'Stream Flow',
                chartDiv: 'hydrology-stream-flow-chart',
            },
            {
                key: 'AvRunoff',
                name: 'Surface Runoff',
                chartDiv: 'hydrology-surface-runoff-chart',
            },
            {
                key: 'AvGroundWater',
                name: 'Subsurface Flow',
                chartDiv: 'hydrology-subsurface-flow-chart',
            },
            {
                key: 'AvPtSrcFlow',
                name: 'Point Source Flow',
                chartDiv: 'hydrology-point-source-flow-chart',
            },
            {
                key: 'AvEvapoTrans',
                name: 'Evapotranspiration',
                chartDiv: 'hydrology-evapotranspiration-chart',
            },
            {
                key: 'AvPrecipitation',
                name: 'Precipitation',
                chartDiv: 'hydrology-precipitation-chart',
            },
        ], { scenarios: scenarios }),
        qualityTable = [],
        qualityCharts = [],
        qualitySelections = new models.SelectionOptionsCollection([
            { group: 'Summary', name: 'Total Loads', active: true },
            { group: 'Summary', name: 'Loading Rates' },
            { group: 'Summary', name: 'Mean Annual Concentration' },
            { group: 'Summary', name: 'Mean Low-Flow Concentration' },
            { group: 'Land Use', name: 'Hay/Pasture' },
            { group: 'Land Use', name: 'Cropland' },
            { group: 'Land Use', name: 'Wooded Areas' },
            { group: 'Land Use', name: 'Wetlands' },
            { group: 'Land Use', name: 'Open Land' },
            { group: 'Land Use', name: 'Barren Areas' },
            { group: 'Land Use', name: 'Low-Density Mixed' },
            { group: 'Land Use', name: 'Medium-Density Mixed' },
            { group: 'Land Use', name: 'High-Density Mixed' },
            { group: 'Land Use', name: 'Other Upland Areas' },
            { group: 'Land Use', name: 'Farm Animals' },
            { group: 'Land Use', name: 'Stream Bank Erosion' },
            { group: 'Land Use', name: 'Subsurface Flow' },
            { group: 'Land Use', name: 'Point Sources' },
            { group: 'Land Use', name: 'Septic Systems' },
        ]);

    // TODO Remove once scenarios is actually used.
    // This is to pacify the linter.
    scenarios.findWhere({ active: true});

    return new models.TabsCollection([
        {
            name: 'Hydrology',
            table: hydrologyTable,
            charts: hydrologyCharts,
            active: true,
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
        var color = SCENARIO_COLORS[index % 32];
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

    App.rootView.compareRegion.show(new CompareWindow2({
        model: compareModel,
    }));
}

module.exports = {
    showCompare: showCompare,
    CompareWindow2: CompareWindow2,
    CompareWindow: CompareWindow,
    getTr55Tabs: getTr55Tabs
};
