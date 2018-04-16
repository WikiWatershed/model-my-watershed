"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    $ = require('jquery'),
    App = require('../../../app'),
    models = require('./models'),
    resultTmpl = require('./templates/result.html'),
    tableTabContentTmpl = require('./templates/tableTabContent.html'),
    tableTabPanelTmpl = require('./templates/tableTabPanel.html'),
    huc12TotalsTableTmpl = require('./templates/huc12TotalsTable.html'),
    sourcesTableTmpl = require('./templates/sourcesTable.html');

var ResultView = Marionette.LayoutView.extend({
    // model: ResultModel
    template: resultTmpl,

    regions: {
        tabPanelRegion: '.subbasin-tab-panel-region',
        tabContentRegion: '.subbasin-tab-content-region',
    },

    templateHelpers: function() {
        return {
            aoiDetails: App.currentProject.get('area_of_interest_name'),
        };
    },

    onShow: function() {
        var tabCollection = new models.SubbasinTabCollection([
            new models.SubbasinTabModel({
                displayName: 'Sources',
                name: 'aoiSources',
            }),
            new models.SubbasinTabModel({
                displayName: 'HUC-12',
                name: 'huc12Totals',
            }),
        ]);
        this.tabPanelRegion.show(new TableTabPanelCollectionView({
            collection: tabCollection,
        }));
        this.tabContentRegion.show(new TableTabContentCollectionView({
            collection: tabCollection,
            model: this.model,
        }));
    },
});

var TableTabPanelView = Marionette.ItemView.extend({
    // model: SubbasinTabModel
    tagName: 'li',
    template: tableTabPanelTmpl,
    attributes: {
        role: 'presentation',
    },
});

var TableTabPanelCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'ul',
    className: 'nav nav-tabs model-nav-tabs',
    attributes: {
        role: 'tablist'
    },

    childView: TableTabPanelView,

    onRender: function() {
        this.$el.find('li:first').addClass('active');
    },
});

var TableTabContentView = Marionette.LayoutView.extend({
    // model: SubbasinTabModel
    template: tableTabContentTmpl,
    tagName: 'div',
    className: 'tab-pane',
    attributes: {
        role: 'tabpanel',
    },
    regions: {
        tableRegion: '.table-region',
    },

    onShow: function() {
        var tableViewKey = this.model.get('name'),
            TableView = tableViews[tableViewKey];
        if (!TableView) {
            console.error('Use of table view key without TableView: ', tableViewKey);
            return null;
        }

        this.tableRegion.show(new TableView({
            model: this.options.result,
        }));
    },

    id: function() {
        return this.model.get('name');
    }
});

var TableTabContentCollectionView = Marionette.CollectionView.extend({
    // collection: SubbasinTabCollection
    tagName: 'div',
    className: 'tab-content model-tab-content',
    childView: TableTabContentView,
    childViewOptions: function() {
        return {
            result: this.model,
        };
    },
    onRender: function() {
        this.$el.find('.tab-pane:first').addClass('active');
    }
});

var AoiSourcesTableView = Marionette.ItemView.extend({
    template: sourcesTableTmpl,

    onAttach: function() {
        $('[data-toggle="table"]').bootstrapTable();
    },

    templateHelpers: function() {
        var result = this.model.get('result');
        return {
            rows: result.Loads,
            summaryRow: result.SummaryLoads,
        };
    },
});

var Huc12TotalsTableView = Marionette.ItemView.extend({
    template: huc12TotalsTableTmpl,
});

var tableViews = {
    aoiSources: AoiSourcesTableView,
    huc12Totals: Huc12TotalsTableView,
};

module.exports = {
    ResultView: ResultView,
};
