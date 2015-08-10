"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    coreModels = require('../core/models'),
    coreViews = require('../core/views'),
    modConfigUtils = require('../modeling/modificationConfigUtils'),
    compareWindowTmpl = require('./templates/compareWindow.html'),
    compareScenariosTmpl = require('./templates/compareScenarios.html'),
    compareScenarioTmpl = require('./templates/compareScenario.html'),
    compareChartTmpl = require('./templates/compareChart.html'),
    compareModificationsTmpl = require('./templates/compareModifications.html');

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
        this.listenTo(App.user, 'change:guest', this.saveAfterLogin);
    },

    saveAfterLogin: function(user, guest) {
        if (!guest && this.model.isNew()) {
            var user_id = user.get('id');
            this.model.set('user_id', user_id);
            this.model.get('scenarios').each(function(scenario) {
                scenario.set('user_id', user_id);
            });
            this.model.saveProjectAndScenarios();
        }
    },

    destroy: function() {
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

    regions: {
        mapRegion: '.map-region',
        chartRegion: '.chart-region',
        precipitationRegion: '.precipitation-region',
        modificationsRegion: '.modifications-region'
    },

    initialize: function(options) {
        this.projectModel = options.projectModel;
    },

    onShow: function() {
        this.mapModel = new coreModels.MapModel({});
        this.mapModel.set('areaOfInterest', this.projectModel.get('area_of_interest'));
        this.mapModel.set('areaOfInterestName', this.projectModel.get('area_of_interest_name'));
        this.mapView = new coreViews.MapView({
            model: this.mapModel,
            el: $(this.el).find('.map-container').get(),
            addZoomControl: false,
            addLocateMeButton: false,
            addLayerSelector: false,
            showLayerAttribution: false,
            initialLayerName: App.getMapView().getActiveBaseLayerName()
        });


        this.mapView.fitToAoi();
        this.mapView.updateAreaOfInterest();
        this.mapView.updateModifications(this.model.get('modifications'));
        this.mapRegion.show(this.mapView);
        this.chartRegion.show(new CompareChartView({
            model: this.model
        }));
        // TODO put in precipitation slider that will trigger model
        // simulations, but doesn't save input or results
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
            projectModel: this.model
        };
    }
});

var CompareChartView = Marionette.ItemView.extend({
    template: compareChartTmpl,

    className: 'chart-container'
    // TODO pick appropriate chart based on model_pacakage
    // this should be similar to code in modeling/views.js
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

module.exports = {
    CompareWindow: CompareWindow
};
