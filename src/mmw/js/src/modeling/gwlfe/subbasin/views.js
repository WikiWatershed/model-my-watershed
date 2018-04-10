"use strict";

var Marionette = require('../../../../shim/backbone.marionette'),
    resultTmpl = require('./templates/result.html');

var ResultView = Marionette.LayoutView.extend({
    template: resultTmpl,
});

module.exports = {
    ResultView: ResultView,
};
