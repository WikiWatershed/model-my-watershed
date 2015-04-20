"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    models = require('./models'),
    windowTmpl = require('./templates/window.ejs');

var AnalyzeWindow = Marionette.LayoutView.extend({
    tagName: 'section',
    id: 'analyze-output-wrapper',
    template: windowTmpl
});


module.exports = {
    AnalyzeWindow: AnalyzeWindow
};
