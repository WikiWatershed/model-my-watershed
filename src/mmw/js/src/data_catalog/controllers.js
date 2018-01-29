"use strict";

var App = require('../app'),
    router = require('../router').router,
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

var DataCatalogController = {
    dataCatalogPrepare: function() {
        if (!App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }
    },

    dataCatalog: function() {
        App.map.setDataCatalogSize();

        App.state.set({
            'active_page': coreUtils.dataCatalogPageTitle,
        });

        var form = new models.SearchForm();

        var catalogs = App.getDataCatalogCollection();

        var resultsWindow = new views.ResultsWindow({
                model: form,
                collection: catalogs
            }),
            header = new views.HeaderView();

        App.rootView.subHeaderRegion.show(header);
        App.rootView.sidebarRegion.show(resultsWindow);
    },

    dataCatalogCleanUp: function() {
        App.map.set({
            dataCatalogResults: null,
            dataCatalogActiveResult: null,
            dataCatalogDetailResult: null,
        });
        App.rootView.sidebarRegion.currentView.collection.forEach(
            function(catalogModel) {
                catalogModel.cancelSearch();
            }
        );
        App.rootView.subHeaderRegion.empty();
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
