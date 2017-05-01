"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    dataCatalogWindowTmpl = require('./templates/window.html'),
    searchbarTmpl = require('./templates/searchbar.html');

var DataCatalogWindow = Marionette.LayoutView.extend({
    template: dataCatalogWindowTmpl,

    regions: {
        'searchBar': '#data-catalog-searchbar-region',
    },

    onShow: function() {
        this.searchBar.show(new SearchBarView());
    },

});

var SearchBarView = Marionette.LayoutView.extend({
    template: searchbarTmpl,
});

module.exports = {
    DataCatalogWindow: DataCatalogWindow,
};
