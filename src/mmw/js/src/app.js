"use strict";

var $ = require('jquery'),
    Marionette = require('../shim/backbone.marionette'),
    views = require('./core/views'),
    models = require('./core/models'),
    userModels = require('./user/models');

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
        this.showLoginModal();
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

    getLeafletMap: function() {
        return this._mapView._leafletMap;
    },

    showLoginModal: function() {
        $('#login').modal('show');
    },

    hideLoginModal: function() {
        $('#login').modal('hide');
    }
});

function RestAPI() {
    return {
        getPredefinedShapes: function() {
            return $.ajax({
                'url': '/api/congressional_districts',
                'type': 'GET'
            });
        },

        getPolygon: function(args) {
            return $.ajax({
                'url': '/api/congressional_districts/id/' + args.id,
                'type': 'GET'
            });
        }
    };
}

module.exports = App;
