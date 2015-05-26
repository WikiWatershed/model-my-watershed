"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../shim/backbone.marionette'),
    views = require('./core/views'),
    models = require('./core/models'),
    userModels = require('./user/models'),
    userViews = require('./user/views');

var App = new Marionette.Application({
    initialize: function() {
        this.restApi = new RestAPI();
        this.map = new models.MapModel();

        // This view is intentionally not attached to any region.
        this._mapView = new views.MapView({
            model: this.map
        });

        this.rootView = new views.RootView();
        this.user = new userModels.UserModel({});
        this.getUserOrShowLogin();

        var header = new views.HeaderView({
            el: 'header',
            model: this.user
        }).render();
    },

    load: function(data) {
        var mapState = data.map;
        if (mapState) {
            this.map.set({
                lat: mapState.lat,
                lng: mapState.lng,
                zoom: mapState.zoom
            });
        }
    },

    getMapView: function() {
        return this._mapView;
    },

    getLeafletMap: function() {
        return this._mapView._leafletMap;
    },

    getUserOrShowLogin: function() {
        this.user.fetch().always(function() {
            if (App.user.get('guest')) {
                App.showLoginModal();
            }
        });
    },

    showLoginModal: function() {
        this.loginModal = new userViews.LoginModalView({
            model: new userModels.LoginFormModel({}),
            app: this
        }).render();
        this.loginModal.$el.modal('show');
    },

    hideLoginModal: function() {
        this.loginModal.$el.modal('hide');
    }
});

function RestAPI() {
    return {
        getPredefinedShapeTypes: _.memoize(function() {
            return $.ajax({
                'url': '/api/modeling/boundary-layers/',
                'type': 'GET'
            });
        }),

        getPolygon: function(args) {
            var url = '/api/modeling/boundary-layers/' + args.tableId + '/' + args.shapeId;
            return $.ajax({
                'url': url,
                'type': 'GET'
            });
        }
    };
}

module.exports = App;
