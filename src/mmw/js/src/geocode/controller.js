"use strict";

var views = require('./views');

var geocoderView = new views.GeocoderView();

module.exports = {
    view: geocoderView
};
