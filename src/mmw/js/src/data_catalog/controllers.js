"use strict";

var App = require('../app'),
    coreUtils = require('../core/utils'),
    models = require('./models'),
    views = require('./views');

var DataCatalogController = {
    dataCatalog: function() {
        App.map.setDataCatalogSize();

        App.state.set({
            'active_page': coreUtils.dataCatalogPageTitle,
        });

        var searchModel = new models.DataCatalogModel();
        var resources = new models.ResourceCollection();

        var view = new views.DataCatalogWindow(searchModel, resources);
        App.rootView.sidebarRegion.show(view);
    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
