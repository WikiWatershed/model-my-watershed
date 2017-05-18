"use strict";

var App = require('../app'),
    utils = require('../core/utils'),
    views = require('./views');

var DataCatalogController = {
    dataCatalog: function() {
        App.map.setDataCatalogSize();

        App.state.set({
            'active_page': utils.dataCatalogPageTitle,
            'was_data_catalog_visible': true,
        });

        var dataCatalogWindow = new views.DataCatalogWindow();

        App.rootView.sidebarRegion.show(dataCatalogWindow);

    }
};

module.exports = {
    DataCatalogController: DataCatalogController,
};
