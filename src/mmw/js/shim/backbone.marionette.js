"use strict";

// Ensure that Backbone is required before Marionette.

var Backbone = require('./backbone'),
    Marionette = require('backbone.marionette');

// Enable support for bundled templates (jstify).
Backbone.Marionette.Renderer.render = function(template, data) {
    return template(data);
};

// Expose Backbone and Marionette for the Marionette Inspector
if (window.__agent) {
  window.__agent.start(Backbone, Marionette);
}

module.exports = Marionette;
