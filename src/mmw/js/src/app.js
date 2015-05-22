"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../shim/backbone.marionette'),
    helpers = require('./helpers'),
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

    getLeafletMap: function() {
        return this._mapView._leafletMap;
    },

    getUserOrShowLogin: function() {
        var csrftoken = helpers.Cookie.get('csrftoken');

        this.user.fetch({
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRFToken', csrftoken);
            }
        }).always(function() {
            if (App.user.get('guest')) {
                App.showLoginModal();
            }
        });
    },

    showLoginModal: function() {
        $('#login').find('#id_username').val("");
        $('#login').find('#id_password').val("");
        $('#login').modal('show');
    },

    hideLoginModal: function() {
        $('#login').modal('hide');
    }
});

function RestAPI() {
    return {
        getPredefinedShapeTypes: function() {
            return $.ajax({
                'url': '/api/modeling/boundary_layers/',
                'type': 'GET'
            });
        },

        getPolygon: function(args) {
            var url = '/api/modeling/congressional_districts/id/' + args.id;
            return $.ajax({
                'url': url,
                'type': 'GET'
            });
        }
    };
}

module.exports = App;
