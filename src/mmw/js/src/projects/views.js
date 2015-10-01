"use strict";

var Marionette = require('../../shim/backbone.marionette'),
    containerTmpl = require('./templates/container.html');

var ProjectsView = Marionette.LayoutView.extend({
    template: containerTmpl,
});

module.exports = {
    ProjectsView: ProjectsView
};
