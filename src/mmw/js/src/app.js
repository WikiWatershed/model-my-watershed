"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../shim/backbone'),
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
    },

    userLogout: function() {
        var csrftoken = helpers.Cookie.get('csrftoken');

        $.ajax({
            url: '/user/ajaxlogout',
            type: 'GET',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-CSRFToken', csrftoken);
            }
        }).always(function() {
            // We silence the first change because we don't want to send two
            // events. The event generated by the second change is enough.
            App.user.unset('username', {silent: true});
            App.user.set('guest', true);

            // Let the user stay at `/` or `/analyze`, but other pages require
            // an account so in those cases redirect to `/`
            var router = require('./router').router;
            var currentRoute = Backbone.history.getFragment();
            if (currentRoute === '' || currentRoute === 'analyze') {
                // Do nothing
            } else {
                // Take them to the home page
                router.navigate('', true);
            }
        });
    }
});

function RestAPI() {
    return {
        getPredefinedShapes: function() {
            return $.ajax({
                'url': '/api/modeling/congressional_districts',
                'type': 'GET'
            });
        },

        getPolygon: function(args) {
            return $.ajax({
                'url': '/api/modeling/congressional_districts/id/' + args.id,
                'type': 'GET'
            });
        }
    };
}

module.exports = App;
