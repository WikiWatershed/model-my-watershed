"use strict";

var Backbone = require('../shim/backbone');

var AppRouter = Backbone.Marionette.AppRouter.extend({
    addRoute: function(route, controller, methodName) {
        this._addAppRoute(controller, route, methodName);
    },

    onRoute: function(name, path, args) {
        console.log('onRoute', name, path, args);
    }
});

var router = new AppRouter();

module.exports = router;
