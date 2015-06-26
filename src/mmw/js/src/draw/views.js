"use strict";

var $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    turfRandom = require('turf-random'),
    turfBuffer = require('turf-buffer'),
    router = require('../router').router,
    App = require('../app'),
    utils = require('./utils'),
    toolbarTmpl = require('./templates/toolbar.html'),
    loadingTmpl = require('./templates/loading.html'),
    selectTypeTmpl = require('./templates/selectType.html'),
    drawAreaTmpl = require('./templates/drawArea.html'),
    resetDrawTmpl = require('./templates/reset.html'),
    placeMarkerTmpl = require('./templates/placeMarker.html');

// Responsible for loading and displaying tools for selecting and drawing
// shapes on the map.
var ToolbarView = Marionette.LayoutView.extend({
    template: toolbarTmpl,

    className: 'draw-tools-container',

    regions: {
        selectTypeRegion: '#select-area-region',
        drawAreaRegion: '#draw-area-region',
        placeMarkerRegion: '#place-marker-region',
        resetRegion: '#reset-draw-region'
    },

    initialize: function() {
        var map = App.getLeafletMap(),
            ofg = L.featureGroup();
        this.model.set('outlineFeatureGroup', ofg);
        map.addLayer(ofg);
    },

    onDestroy: function() {
        var map = App.getLeafletMap(),
            ofg = this.model.get('outlineFeatureGroup');
        map.removeLayer(ofg);
        this.model.set('outlineFeatureGroup', null);
    },

    onShow: function() {
        this.selectTypeRegion.show(new SelectAreaView({
            model: this.model
        }));
        this.drawAreaRegion.show(new DrawAreaView({
            model: this.model
        }));
        this.placeMarkerRegion.show(new PlaceMarkerView({
            model: this.model
        }));
        this.resetRegion.show(new ResetDrawView({
            model: this.model
        }));
    }
});

var SelectAreaView = Marionette.ItemView.extend({
    ui: {
        'items': '[data-endpoint]',
        'button': '#predefined-shape'
    },

    events: {
        'click @ui.items': 'onItemClicked'
    },

    modelEvents: {
        'change': 'render'
    },

    onItemClicked: function(e) {
        var $el = $(e.target),
            endpoint = $el.data('endpoint'),
            tableId = $el.data('tableid');

        clearAoiLayer();
        changeOutlineLayer(endpoint, tableId, this.model);
        e.preventDefault();
    },

    getTemplate: function() {
        var types = this.model.get('predefinedShapeTypes');
        return !types ? loadingTmpl : selectTypeTmpl;
    }
});

var DrawAreaView = Marionette.ItemView.extend({
    template: drawAreaTmpl,

    ui: {
        'button': '#custom-shape',
    },

    events: {
        'click @ui.button': 'onButtonPressed',
    },

    modelEvents: {
        'change:toolsEnabled': 'render'
    },

    onButtonPressed: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

        this.model.disableTools();
        utils.drawPolygon(map).then(function(shape) {
            addLayer(shape);
            navigateToAnalyze();
        }).fail(function() {
            revertLayer();
        }).always(function() {
            self.model.enableTools();
        });
    }
});

var PlaceMarkerView = Marionette.ItemView.extend({
    template: placeMarkerTmpl,

    ui: {
        'items': '[data-shape-type]',
        'button': '#delineate-shape',
    },

    events: {
        'click @ui.items': 'onItemClicked',
    },

    modelEvents: {
        'change:toolsEnabled': 'render'
    },

    onItemClicked: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

        this.model.disableTools();
        utils.placeMarker(map).then(function(latlng) {
            // TODO: This is temporary until we have
            // endpoints that can actually delienate
            // watersheds.
            var point = {
                  "type": "Feature", "properties": {}, "geometry": {
                    "type": "Point",
                    "coordinates": [latlng.lng, latlng.lat]
                  }
                },
                buffered = turfBuffer(point, 5000, 'meters'),
                bounds = L.geoJson(buffered).getBounds(),
                shape = turfRandom('polygons', 1, {
                    max_vertcies: 50,
                    bbox: [
                        bounds.getWest(), bounds.getSouth(),
                        bounds.getEast(), bounds.getNorth()
                    ],
                    max_radial_length: 0.25
                });

            addLayer(shape);
            navigateToAnalyze();
        }).fail(function() {
            revertLayer();
        }).always(function() {
            self.model.enableTools();
        });
    }
});

var ResetDrawView = Marionette.ItemView.extend({
    template: resetDrawTmpl,

    ui: { 'reset': 'button' },

    events: { 'click @ui.reset': 'resetDrawingState' },

    resetDrawingState: function() {
        utils.cancelDrawing(App.getLeafletMap());
        clearAoiLayer();
        clearBoundaryLayer(this.model);
    }
});

function getShapeAndAnalyze(e, model, ofg, grid, tableId) {
    console.log('clicked');
    // The shapeId might not be available at the time of the click
    // because the UTF Grid layer might not be loaded yet, so
    // we poll for it.
    var pollInterval = 200,
        maxPolls = 2,
        pollCount = 0,
        deferred = $.Deferred(),
        shapeId = e.data ? e.data.id : null;

        if (shapeId) {
            _getShapeAndAnalyze();
        } else {
            pollForShapeId();
        }

    function _getShapeAndAnalyze() {
        App.restApi.getPolygon({
            tableId: tableId,
            shapeId: shapeId
        }).done(function(shape) {
            addLayer(shape);
            ofg.clearLayers();
            navigateToAnalyze();
            deferred.resolve();
        }).fail(function() {
            console.log('Shape endpoint failed');
            deferred.reject();
        }).always(function() {
            model.enableTools();
        });
    }

    function pollForShapeId() {
        console.log('Shape ID not available yet.');
        if (pollCount < maxPolls) {
            var shapeData = grid._objectForEvent(e).data;
            if (shapeData && shapeData.id) {
                shapeId = shapeData.id;
                _getShapeAndAnalyze();
            } else {
                window.setTimeout(pollForShapeId, pollInterval);
                pollCount++;
            }
        } else {
            L.popup()
                .setLatLng(e.latlng)
                .setContent('The region was not available. Please try clicking again.')
                .openOn(App.getLeafletMap());
            console.log('Failed to get shape ID within time limit.');
            model.enableTools();
            deferred.reject();
        }
    }

    return deferred;
}

function changeOutlineLayer(endpoint, tableId, model) {
    var ofg = model.get('outlineFeatureGroup');

    // Go about the business of adding the ouline and UTFgrid layers.
    if (endpoint && tableId !== undefined) {
        var ol = new L.TileLayer(endpoint + '.png'),
            grid = new L.UtfGrid(endpoint + '.grid.json?callback={cb}',
                                 {
                                     resolution: 4,
                                     maxRequests: 8
                                 });
        grid.on('click', function(e) {
            getShapeAndAnalyze(e, model, ofg, grid, tableId);
        });

        console.log('click listener ready');
        ofg.clearLayers();
        ofg.addLayer(ol);
        ofg.addLayer(grid);
    }
}

function clearAoiLayer() {
    App.map.set('areaOfInterest', null);
    return function revertLayer() {
        var previousShape = App.map.previous('areaOfInterest');
        App.map.set('areaOfInterest', previousShape);
    };
}

function clearBoundaryLayer(model) {
    var ofg = model.get('outlineFeatureGroup');
    if (ofg) {
        ofg.clearLayers();
    }
}

function addLayer(shape) {
    App.map.set('areaOfInterest', shape);
}

function navigateToAnalyze() {
    router.navigate('analyze', { trigger: true });
}

module.exports = {
    ToolbarView: ToolbarView,
    changeOutlineLayer: changeOutlineLayer,
    getShapeAndAnalyze: getShapeAndAnalyze
};
