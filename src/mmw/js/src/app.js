"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Marionette = require('../shim/backbone.marionette'),
    shutterbug = require('../shim/shutterbug'),
    views = require('./core/views'),
    LayerPickerView = require('./core/layerPicker'),
    models = require('./core/models'),
    settings = require('./core/settings'),
    itsi = require('./core/itsiEmbed'),
    analyzeModels = require('./analyze/models'),
    dataCatalogModels = require('./data_catalog/models'),
    userModels = require('./user/models'),
    userViews = require('./user/views');

var App = new Marionette.Application({
    initialize: function() {
        this.restApi = new RestAPI();
        this.map = new models.MapModel();
        this.layerTabs = new models.LayerTabCollection(null);
        this.state = new models.AppStateModel();

        // If in embed mode we are by default in activity mode.
        var activityMode = settings.get('sso_enabled') &&
                settings.get('itsi_embed');
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

        this.layerTabs.disableLayersOnZoomAndPan(this.getLeafletMap());

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

        // Enabling hiding popovers from within them
        window.closePopover = function() {
            $('[data-toggle="popover"]').popover('hide');
            $('.popover').remove();
        };

        fetchVersion();
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
            timeSliderRegion: this.rootView.layerPickerSliderRegion,
        });
        this.rootView.layerPickerRegion.show(this.layerPickerView);
    },

    destroyLayerPicker: function() {
        this.rootView.layerPickerRegion.empty();
        this.rootView.layerPickerSliderRegion.empty();
    },

    getAnalyzeCollection: function() {
        if (!this.analyzeCollection) {
            var aoi = this.map.get('areaOfInterest'),
                wkaoi = this.map.get('wellKnownAreaOfInterest'),
                drainageArea = this.map.get('areaOfInterestDrainageArea');

            this.analyzeCollection = analyzeModels.createAnalyzeTaskGroupCollection(aoi, wkaoi, drainageArea);
        }

        return this.analyzeCollection;
    },

    clearAnalyzeCollection: function() {
        delete this.analyzeCollection;
    },

    getDataCatalog: function() {
        if (!this.dataCatalog) {
            this.dataCatalog = {
                model: new dataCatalogModels.SearchForm(),
                collection: dataCatalogModels.createCatalogCollection()
            };
        }

        return this.dataCatalog;
    },

    clearDataCatalog: function() {
        delete this.dataCatalog;

        this.map.set({
            'dataCatalogResults': null,
            'dataCatalogActiveResult': null,
            'dataCatalogDetailResult': null,
        });
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
            } else {
                settings.set('unit_scheme',
                    App.user.get('profile').unit_scheme);
            }
        });
    },


    showLoginModal: function(onSuccess) {
        var self = this;
        var loginModalView = new userViews.LoginModalView({
            model: new userModels.LoginFormModel({
                showSSOButtons: settings.get('sso_enabled'),
            },
            {
                onSuccess:  function(loginResponse) {
                    if (loginResponse.profile_was_skipped || loginResponse.profile_is_complete) {
                        if (onSuccess && _.isFunction(onSuccess)) {
                            onSuccess(loginResponse);
                        }
                    } else {
                        loginModalView.$el.modal('hide');
                        loginModalView.$el.on('hidden.bs.modal', function() {
                            new userViews.UserProfileModalView({
                                model: new userModels.UserProfileFormModel({}, {
                                    onSuccess: onSuccess
                                }),
                                app: self
                            }).render();
                        });
                    }
                }
            }),
            app: self
        }).render();
    },

    showProfileModal: function (onSuccess) {
        new userViews.UserProfileModalView({
            model: new userModels.UserProfileFormModel({}, {
                onSuccess: onSuccess
            }),
            app: this
        }).render();
    },

    // Hides Map Info View
    // If passed { empty: true } will empty the region
    hideMapInfo: function(options) {
        var region = this.rootView.mapInfoRegion;

        if (options && options.empty) {
            region.empty();
        }

        region.$el.hide();
    },

    // Shows Map Info View if already populated
    // If passed { view: $viewObject } will show the given $viewObject
    showMapInfo: function(options) {
        var region = this.rootView.mapInfoRegion;

        if (options && options.view) {
            region.empty();
            region.show(options.view);
        }

        region.$el.show();
    }
});

function RestAPI() {
    return {
        getPolygon: function(args) {
            var url = '/mmw/modeling/boundary-layers/' + args.layerCode + '/' + args.shapeId;
            return $.ajax({
                'url': url,
                'type': 'GET'
            });
        }
    };
}

function adjustModelViewBeforeITSIScreenshot() {
    toggleModelViewForITSIScreenshot(true);
}

function adjustModelViewAfterITSIScreenshot() {
    toggleModelViewForITSIScreenshot(false);
}

function toggleModelViewForITSIScreenshot(adjustForScreenshot) {
    var modelHeaderProject = '.project',
        modelHeaderToolbar = '.toolbar',
        modelToolbarContainer = '.toolbar-container',
        itsiModelToolbar = 'itsi-model-toolbar';

    if (adjustForScreenshot) {
        $(modelHeaderProject).addClass(itsiModelToolbar);
        $(modelHeaderToolbar).addClass(itsiModelToolbar);
        $(modelToolbarContainer).addClass(itsiModelToolbar);
    } else {
        $(modelHeaderProject).removeClass(itsiModelToolbar);
        $(modelHeaderToolbar).removeClass(itsiModelToolbar);
        $(modelToolbarContainer).removeClass(itsiModelToolbar);
    }
}

function adjustCompareViewBeforeITSIScreenshot() {
    toggleCompareViewForITSIScreenshot(true);
}

function adjustCompareViewAfterITSIScreenshot() {
    toggleCompareViewForITSIScreenshot(false);
}

function toggleCompareViewForITSIScreenshot(adjustForScreenshot) {
    var itsiCompareDialog = 'itsi-compare-dialog',
        itsiCompareModal = 'itsi-compare-modal',
        itsiCompareRow = 'itsi-compare-row',
        compareDialog = '#compare-new-dialog',
        compareModalContent = '.compare-modal-content',
        compareCloseButton = '.compare-close',
        compareChartButton = '#compare-input-button-chart',
        compareTableButton = '#compare-input-button-table',
        compareSections = '.compare-sections',
        compareChartRow = '.compare-chart-row',
        compareTableRow = '.compare-table-row',
        compareScenariosRow = '.compare-scenarios',
        compareMapsRow = '.compare-scenario-row-content';

    if (adjustForScreenshot) {
        $(compareSections + '> div').css('margin-top',
            '-' + $(compareSections).scrollTop() + 'px'
        );
        $(compareDialog).addClass(itsiCompareDialog);
        $(compareModalContent).addClass(itsiCompareModal);
        $(compareCloseButton).hide();
        $(compareChartButton).hide();
        $(compareTableButton).hide();
        $(compareScenariosRow).addClass(itsiCompareRow);
        $(compareMapsRow).addClass(itsiCompareRow);
        if ($(compareChartRow).length) {
            $(compareChartRow).addClass(itsiCompareRow);
        } else if ($(compareTableRow).length) {
            $(compareTableRow).addClass(itsiCompareRow);
        }
    } else {
        $(compareDialog).removeClass(itsiCompareDialog);
        $(compareModalContent).removeClass(itsiCompareModal);
        $(compareCloseButton).show();
        $(compareChartButton).show();
        $(compareTableButton).show();
        $(compareScenariosRow).removeClass(itsiCompareRow);
        $(compareMapsRow).removeClass(itsiCompareRow);
        if ($(compareChartRow)) {
            $(compareChartRow).removeClass(itsiCompareRow);
        } else if ($(compareTableRow).length) {
            $(compareTableRow).removeClass(itsiCompareRow);
        }

        var mtString = $(compareSections + '> div').css('margin-top'),
            marginTop = parseInt(mtString.substring(1, mtString.length - 2));

        $(compareSections + '> div').css('margin-top', '');
        $(compareSections).scrollTop(marginTop);
    }
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

            if ($('#compare-new').length) {
                adjustCompareViewBeforeITSIScreenshot();
            }

            if ($('.project')) {
                adjustModelViewBeforeITSIScreenshot();
            }
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

            if ($('#compare-new').length) {
                adjustCompareViewAfterITSIScreenshot();
            }

            if ($('.project')) {
                adjustModelViewAfterITSIScreenshot();
            }
        });

    shutterbug.enable('body');
}

function fetchVersion() {
    if (document.location.hostname === 'localhost') {
        // Local development environment, don't fetch version.txt
        settings.set('branch', 'local');
        settings.set('gitDescribe', null);
        return;
    }

    $.get('/version.txt')
        .done(function(data) {
            var versions = data.match(/(\S+)\s+(\S+)/),
                branch = versions[1],
                gitDescribe = versions[2];

            settings.set('branch', branch);
            settings.set('gitDescribe', gitDescribe);
        })
        .fail(function(error) {
            settings.set('branch', null);
            settings.set('gitDescribe', null);
        });
}

module.exports = App;
