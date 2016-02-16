"use strict";

var $ = require('jquery'),
    Marionette = require('../shim/backbone.marionette'),
    shutterbug = require('../shim/shutterbug'),
    views = require('./core/views'),
    models = require('./core/models'),
    settings = require('./core/settings'),
    itsi = require('./core/itsiEmbed'),
    userModels = require('./user/models'),
    userViews = require('./user/views');

var App = new Marionette.Application({
    initialize: function() {
        this.restApi = new RestAPI();
        this.map = new models.MapModel();
        this.state = new models.AppStateModel();

        // If in embed mode we are by default in activity mode.
        var activityMode = settings.get('itsi_embed');
        settings.set('activityMode', activityMode);

        // Initialize embed interface if in activity mode
        if (activityMode) {
            this.itsi = new itsi.ItsiEmbed(this);
        }

        // This view is intentionally not attached to any region.
        this._mapView = new views.MapView({
            model: this.map,
            el: '#map'
        });

        this._mapView.on('change:needs_reset', function(needs) {
            App.currentProject.set('needs_reset', needs);
        });

        this.rootView = new views.RootView({app: this});
        this.user = new userModels.UserModel({});

        this.header = new views.HeaderView({
            el: 'header',
            model: this.user,
            appState: this.state
        });

        this.header.render();

        // Not set until modeling/controllers.js creates a
        // new project.
        this.currentProject = null;

        // Enable screenshot functionality
        initializeShutterbug();
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
        new userViews.LoginModalView({
            model: new userModels.LoginFormModel({}),
            app: this
        }).render();
    }
});

function RestAPI() {
    return {
        getPolygon: function(args) {
            var url = '/api/modeling/boundary-layers/' + args.layerCode + '/' + args.shapeId;
            return $.ajax({
                'url': url,
                'type': 'GET'
            });
        }
    };
}

function initializeShutterbug() {
    $(window)
        .on('shutterbug-saycheese', function() {
            // Set fixed width before screenshot to constrain width to viewport
            $('#model-output-wrapper, body > .map-container').css({
                'width': window.innerWidth
            });
        })
        .on('shutterbug-asyouwere', function() {
            // Reset after screenshot has been taken
            $('#model-output-wrapper, body > .map-container').css({
                'width': ''
            });
        });

    shutterbug.enable('body');
}

module.exports = App;
