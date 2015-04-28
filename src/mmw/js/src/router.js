"use strict";

var Backbone = require('../shim/backbone'),
    $ = require('jquery'),
    _ = require('lodash');

// TODO: Remove when Backbone v1.2.0 is released.
// Passes the route name to execute.
// Source: https://github.com/jashkenas/backbone/commit/623207831ec09687f9cd9fa3a461f88849b02578
var PatchedRouter = Backbone.Marionette.AppRouter.extend({
    route: function(route, name, callback) {
        if (!_.isRegExp(route)) route = this._routeToRegExp(route);

        if (_.isFunction(name)) {
            callback = name;
            name = '';
        }

        if (!callback) callback = this[name];
        var router = this;
        Backbone.history.route(route, function(fragment) {
            var args = router._extractParameters(route, fragment);
            if (router.execute(callback, args, name) !== false) {
                router.trigger.apply(router, ['route:' + name].concat(args));
                router.trigger('route', name, args);
                Backbone.history.trigger('route', router, name, args);
            }
        });

        return this;
    }
});

// TODO: When Backbone v1.2.0 is released, change parent
// class to Backbone.Marionette.AppRouter
var AppRouter = PatchedRouter.extend({
    // Key of last route context.
    _previousRouteName: null,

    // Map of { routeName: { controller: [Object], methodName: [String] }, ... }
    _routeContext: null,

    // Promise chain to ensure everything triggers in order even if there
    // are animations in the setUp/tearDown methods.
    _sequence: null,

    initialize: function() {
        this._routeContext = {};
        this._sequence = $.Deferred().resolve().promise();
    },

    addRoute: function(route, controller, methodName) {
        var routeName = route.toString(),
            cb = controller[methodName];

        this._routeContext[routeName] = {
            controller: controller,
            methodName: methodName
        };

        this.route(route, routeName, cb);
    },

    execute: function(cb, args, routeName) {
        var context = this._routeContext[routeName],
            prepare = this.getSuffixMethod(context, 'Prepare');

        if (this._previousRouteName) {
            var prevContext = this._routeContext[this._previousRouteName],
                cleanUp = this.getSuffixMethod(prevContext, 'CleanUp');
            this._sequence = this._sequence.then(function() {
                return cleanUp.apply(null, args);
            });
        }

        this._sequence = this._sequence.then(function() {
            var result = prepare.apply(null, args);
            // Assume result is a promise if an object is returned.
            if (_.isObject(result)) {
                return result.then(function() {
                    cb.apply(null, args);
                });
            // Only execute the route callback if prepare
            // did not return false.
            } else if (result !== false) {
                cb.apply(null, args);
            }
        });

        this._previousRouteName = routeName;
    },

    getSuffixMethod: function(context, suffix) {
        var methodName = context.methodName + suffix,
            cb = context.controller[methodName];
        return cb ? cb : _.identity;
    }
});

var router = new AppRouter();

module.exports = {
    router: router,
    AppRouter: AppRouter
};
