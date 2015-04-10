"use strict";

var Backbone = require('../shim/backbone'),
    controllers = require('./controllers'),
    AppController = controllers.AppController;

var AppRouter = Backbone.Marionette.AppRouter.extend({
    addRoute: function(route, controller, methodName) {
        this._addAppRoute(controller, route, methodName);
    },

    onRoute: function(name, path, args) {
        console.log('onRoute', name, path, args);
    }
});

var router = new AppRouter();
router.addRoute(/^/, AppController, 'index');
router.addRoute(/^analyze/, AppController, 'analyze');
router.addRoute(/^model/, AppController, 'runModel');
router.addRoute(/^compare/, AppController, 'compare');

module.exports = router;
