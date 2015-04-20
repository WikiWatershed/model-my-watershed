"use strict";

var Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    $ = require('jquery');

var SlidingRegion = Marionette.Region.extend({
    attachHtml: function(view) {
        this.$el.empty();
        $(view.el).appendTo(this.$el).slideDown(300);
    }
});

module.exports = {
    SlidingRegion: SlidingRegion
};
