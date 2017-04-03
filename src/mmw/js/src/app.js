"use strict";

var $ = require('jquery'),
    Marionette = require('../shim/backbone.marionette'),
    shutterbug = require('../shim/shutterbug'),
    views = require('./core/views'),
    LayerPickerView = require('./core/layerPicker'),
    models = require('./core/models'),
    settings = require('./core/settings'),
    itsi = require('./core/itsiEmbed'),
    analyzeModels = require('./analyze/models'),
    userModels = require('./user/models'),
    userViews = require('./user/views');

var App = new Marionette.Application({
    initialize: function() {
        this.restApi = new RestAPI();
        this.map = new models.MapModel();
        this.layerTabs = new models.LayerTabCollection(null);
        this.state = new models.AppStateModel();

        // If in embed mode we are by default in activity mode.
        var activityMode = settings.get('itsi_embed');
        settings.set('activityMode', activityMode);

        // Initialize embed interface if in activity mode
        if (activityMode) {
            this.itsi = new itsi.ItsiEmbed(this);
            this.itsi.getAuthInfo();
        }

        // This view is intentionally not attached to any region.
        this._mapView = new views.MapView({
            model: this.map,
            layerTabCollection: this.layerTabs,
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

        if (settings.isLayerSelectorEnabled()) {
            this.showLayerPicker();
        }

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

    getLayerTabCollection: function() {
        return this.layerTabs;
    },

    showLayerPicker: function() {
        this.layerPickerView = new LayerPickerView({
            collection: this.layerTabs,
            leafletMap: this.getLeafletMap(),
        });
        this.rootView.layerPickerRegion.show(this.layerPickerView);
    },

    getAnalyzeCollection: function() {
        if (!this.analyzeCollection) {
            this.analyzeCollection = analyzeModels.createAnalyzeTaskCollection(this.map.get('areaOfInterest'));
        }

        return this.analyzeCollection;
    },

    clearAnalyzeCollection: function() {
        delete this.analyzeCollection;
    },

    getMapView: function() {
        return this._mapView;
    },

    getLeafletMap: function() {
        return this._mapView._leafletMap;
    },

    getUserOrShowLoginIfNotItsiEmbed: function() {
        if (!settings.get('itsi_embed')) {
            this.getUserOrShowLogin();
        }
    },

    getUserOrShowLogin: function() {
        this.user.fetch().always(function() {
            if (App.user.get('guest')) {
                App.showLoginModal();
            }
        });
    },

    showLoginModal: function(onSuccess) {
        new userViews.LoginModalView({
            model: new userModels.LoginFormModel({
                successCallback: onSuccess
            }),
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
    var googleTileLayerSelector = '#map > .leaflet-google-layer > div > div > div:nth-child(1) > div:nth-child(1)';

    $(window)
        .on('shutterbug-saycheese', function() {
            // Set fixed width before screenshot to constrain width to viewport
            $('#model-output-wrapper, body > .map-container').css({
                'width': window.innerWidth
            });

            var activeBaseLayer = App.getLayerTabCollection().getCurrentActiveBaseLayer(),
                googleLayerVisible = !!activeBaseLayer.get('leafletLayer')._google;

            if (googleLayerVisible) {
                // Convert Google Maps CSS Transforms to Left / Right
                var $googleTileLayer = $(googleTileLayerSelector),
                    transform = $googleTileLayer.css('transform').split(','),
                    left = parseFloat(transform[4]),
                    top = parseFloat(transform[5]);

                $googleTileLayer.css({
                    transform: 'none',
                    left: left,
                    top: top,
                });
            }

            // Fix Firefox screenshots by adding a '#' to the URL.
            // Setting to empty string does nothing, so we first set to
            // '/' then to empty string, which leaves a '#' in the URL.
            document.location.hash = '/';
            document.location.hash = '';
        })
        .on('shutterbug-asyouwere', function() {
            // Reset after screenshot has been taken
            $('#model-output-wrapper, body > .map-container').css({
                'width': ''
            });

            var activeBaseLayer = App.getLayerTabCollection().getCurrentActiveBaseLayer(),
                googleLayerVisible = !!activeBaseLayer.get('leafletLayer')._google;

            if (googleLayerVisible) {
                var $googleTileLayer = $(googleTileLayerSelector),
                    left = parseFloat($googleTileLayer.css('left')),
                    top = parseFloat($googleTileLayer.css('top')),
                    transform = 'matrix(1, 0, 0, 1, ' + left + ', ' + top + ')';

                $googleTileLayer.css({
                    transform: transform,
                    left: '',
                    top: '',
                });
            }
        });

    shutterbug.enable('body');
}

module.exports = App;
