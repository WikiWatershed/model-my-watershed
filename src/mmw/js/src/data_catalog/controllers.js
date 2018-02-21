"use strict";

var App = require('../app'),
    router = require('../router').router,
    coreUtils = require('../core/utils'),
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

        var resultsWindow = new views.ResultsWindow(App.getDataCatalog()),
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
