"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    windowTmpl = require('./templates/window.html');

var MonitorWindow = Marionette.LayoutView.extend({
    template: windowTmpl,
    className: 'monitor-window',
});

module.exports = {
    MonitorWindow: MonitorWindow
};
