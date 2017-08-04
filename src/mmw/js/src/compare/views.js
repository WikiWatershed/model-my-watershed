"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    models = require('./models'),
    modelingModels = require('../modeling/models'),
    modelingViews = require('../modeling/views'),
    PrecipitationView = require('../modeling/controls').PrecipitationView,
    modConfigUtils = require('../modeling/modificationConfigUtils'),
    compareWindowTmpl = require('./templates/compareWindow.html'),
    compareWindow2Tmpl = require('./templates/compareWindow2.html'),
    compareTabPanelTmpl = require('./templates/compareTabPanel.html'),
    compareInputsTmpl = require('./templates/compareInputs.html'),
    compareScenarioItemTmpl = require('./templates/compareScenarioItem.html'),
    compareTableRowTmpl = require('./templates/compareTableRow.html'),
    compareScenariosTmpl = require('./templates/compareScenarios.html'),
    compareScenarioTmpl = require('./templates/compareScenario.html'),
    compareModelingTmpl = require('./templates/compareModeling.html'),
    compareModificationsTmpl = require('./templates/compareModifications.html');

var CompareWindow2 = Marionette.LayoutView.extend({
    template: compareWindow2Tmpl,

    id: 'compare-new',

    ui: {
        closeButton: '.compare-close > button',
    },

    events: {
        'click @ui.closeButton': 'closeView',
    },

    modelEvents: {
        'change:mode': 'showSectionsView',
    },

    regions: {
        tabRegion: '.compare-tabs',
        inputsRegion: '.compare-inputs',
        scenariosRegion: '#compare-title-row',
        sectionsRegion: '.compare-sections',
    },

    onShow: function() {
        this.tabRegion.show(new TabPanelsView({
            collection: this.model.get('tabs'),
        }));
        this.inputsRegion.show(new InputsView({
            model: this.model,
        }));
        this.scenariosRegion.show(new ScenariosRowView({
            collection: this.model.get('scenarios'),
        }));

        this.showSectionsView();
    },

    showSectionsView: function() {
        if (this.model.get('mode') === models.constants.CHART) {
            // TODO: Show Chart View
            this.sectionsRegion.empty();
        } else {
            this.sectionsRegion.show(new TableView({
                collection: this.model.get('tabs')
                                .findWhere({ active: true })
                                .get('table'),
            }));
        }
    },

    closeView: function() {
        App.rootView.compareRegion.empty();
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

    events: {
        'click': 'selectTab',
    },

    onRender: function() {
        if (this.model.get('active')) {
            this.$el.addClass('active');
        } else {
            this.$el.removeClass('active');
        }
    },

    selectTab: function(e) {
        // TODO: Make this select the tab

        e.preventDefault();
        return false;
    },
});

var TabPanelsView = Marionette.CollectionView.extend({
    childView: TabPanelView,
});

var InputsView = Marionette.LayoutView.extend({
    template: compareInputsTmpl,

    ui: {
        chartButton: '#compare-input-button-chart',
        tableButton: '#compare-input-button-table',
    },

    events: {
        'click @ui.chartButton': 'setChartView',
        'click @ui.tableButton': 'setTableView',
    },

    regions: {
        precipitationRegion: '.compare-precipitation',
    },

    onShow: function() {
        var addOrReplaceInput = _.bind(this.model.addOrReplaceInput, this.model),
            controlModel = this.model.get('scenarios')
                               .findWhere({ active: true })
                               .get('inputs')
                               .findWhere({ name: 'precipitation' }),
            precipitationModel = this.model.get('controls')
                                     .findWhere({ name: 'precipitation' });

        this.precipitationRegion.show(new PrecipitationView({
            model: precipitationModel,
            controlModel: controlModel,
            addOrReplaceInput: addOrReplaceInput,
        }));
    },

    setChartView: function() {
        this.model.set({ mode: models.constants.CHART });
    },

    setTableView: function() {
        this.model.set({ mode: models.constants.TABLE });
    },
});

var ScenarioItemView = Marionette.ItemView.extend({
    className: 'compare-column',
    template: compareScenarioItemTmpl,
});

var ScenariosRowView = Marionette.CollectionView.extend({
    className: 'compare-scenario-row-content',
    childView: ScenarioItemView,
});

var TableRowView = Marionette.ItemView.extend({
    className: 'compare-table-row',
    template: compareTableRowTmpl,
});

var TableView = Marionette.CollectionView.extend({
    childView: TableRowView,
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
        $(window).bind('resize.app', _.debounce(_.bind(this.updateContainerPos, this)));
    },

    onDestroy: function() {
        $(window).unbind('resize.app');
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
        this.mapView.updateModifications(this.model.get('modifications'));
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
    var runoffTable = [
            {
                name: "Runoff",
                unit: "cm",
                values: scenarios.map(function(s) {
                    // TODO Make less brittle
                    return s.get('results')
                            .findWhere({ name: "runoff" })
                            .get('result')
                            .runoff.modified.runoff;
                })
            },
            {
                name: "Evapotranspiration",
                unit: "cm",
                values: scenarios.map(function(s) {
                    return s.get('results')
                        .findWhere({ name: "runoff" })
                        .get('result')
                        .runoff.modified.et;
                })
            },
            {
                name: "Inflitration",
                unit: "cm",
                values: scenarios.map(function(s) {
                    return s.get('results')
                        .findWhere({ name: "runoff" })
                        .get('result')
                        .runoff.modified.inf;
                })
            },
        ],
        // TODO Make Runoff charts
        runoffCharts = [],
        // TODO Calculate Water Quality table
        qualityTable = [],
        // TODO Calculate Water Quality charts
        qualityCharts = [];

    return [
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
    ];
}

function getGwlfeTabs(scenarios) {
    // TODO Implement
    var hydrologyTable = [],
        hydrologyCharts = [],
        qualityTable = [],
        qualityCharts = [];

    // TODO Remove once scenarios is actually used.
    // This is to pacify the linter.
    scenarios.findWhere({ active: true});

    return [
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
        },
    ];
}

function copyScenario(scenario, aoi_census) {
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
        // Add 100% Forest Cover scenario
        var forestScenario = copyScenario(ccScenario, aoi_census);

        forestScenario.set({
            name: '100% Forest Cover',
            is_current_conditions: false,
            is_pre_columbian: true,
        });

        tempScenarios.add(forestScenario);
    }

    trueScenarios.forEach(function(scenario) {
        tempScenarios.add(copyScenario(scenario, aoi_census));
    });

    return tempScenarios;
}

function showCompare() {
    var model_package = App.currentProject.get('model_package'),
        isTr55 = model_package === modelingModels.TR55_PACKAGE,
        scenarios = getCompareScenarios(isTr55),
        tabs = isTr55 ? getTr55Tabs(scenarios) : getGwlfeTabs(scenarios),
        controls = isTr55 ? [{ name: 'precipitation' }] : [],
        compareModel = new models.WindowModel({
            controls: controls,
            tabs: tabs,
        });

    compareModel.set({ scenarios: scenarios });

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
    CompareWindow: CompareWindow
};
