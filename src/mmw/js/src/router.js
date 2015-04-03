"use strict";

var Backbone = require('../shim/backbone'),
    controllers = require('./controllers');

var AppRouter = Backbone.Marionette.AppRouter.extend({
    onRoute: function(name, path, args) {
        console.log('onRoute', name, path, args);
    }
});

var router = new AppRouter();
router.processAppRoutes(controllers.AppController, {
    '': 'index',
    'analyze': 'analyze',
    'model': 'runModel',
    'compare': 'compare'
});

module.exports = router;
