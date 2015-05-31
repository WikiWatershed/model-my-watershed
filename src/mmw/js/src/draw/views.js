"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    router = require('../router').router,
    App = require('../app'),
    models = require('./models'),
    toolbarTmpl = require('./templates/toolbar.html'),
    loadingTmpl = require('./templates/loading.html'),
    selectTypeTmpl = require('./templates/selectType.html'),
    drawAreaTmpl = require('./templates/drawArea.html'),
    placeMarkerTmpl = require('./templates/placeMarker.html');

// Responsible for loading and displaying tools for selecting and drawing
// shapes on the map.
var ToolbarView = Marionette.LayoutView.extend({
    template: toolbarTmpl,

    regions: {
        selectTypeRegion: '#select-area-region',
        drawAreaRegion: '#draw-area-region',
        placeMarkerRegion: '#place-marker-region'
    },

    modelEvents: {
        'change:toolsEnabled': 'manageOutlineLayer'
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
    },

    manageOutlineLayer: function() {
        var enabled = this.model.get('toolsEnabled'),
            ofg = this.model.get('outlineFeatureGroup');

        if (!enabled) {
            ofg.clearLayers();
        }
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
        var self = this,
            $el = $(e.target),
            endpoint = $el.data('endpoint'),
            tableId = $el.data('tableid');

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
            revertLayer = clearLayer();

        this.model.disableTools();
        drawPolygon().then(function(shape) {
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

    onItemClicked: function(e) {
        var self = this,
            $el = $(e.target),
            shapeType = $el.data('shape-type'),
            revertLayer = clearLayer();

        this.model.disableTools();
        placeMarker().then(function(latlng) {
            App.restApi.getPolygon({
                shapeType: shapeType,
                lat: latlng.lat,
                lng: latlng.lng
            }).then(function(shape) {
                addLayer(shape);
                navigateToAnalyze();
            }).fail(function() {
                revertLayer();
            });
        }).fail(function() {
            revertLayer();
        }).always(function() {
            self.model.enableTools();
        });
    }
});

function changeOutlineLayer(endpoint, tableId, model) {
    var map = App.getLeafletMap();

    if (endpoint && tableId != undefined) {
        var ol = new L.TileLayer(endpoint + '.png'),
            grid = new L.UtfGrid(endpoint + '.grid.json?callback={cb}', { resolution: 4 }),
            ofg = model.get('outlineFeatureGroup');

        ofg.addLayer(ol);
        ofg.addLayer(grid);

        grid.on('click', function (e) {
            var shapeId = e.data ? e.data.id : null,
                revertLayer = clearLayer();

            if (model) {
                model.disableTools();
            }
            App.restApi.getPolygon({
                tableId: tableId,
                shapeId: shapeId
            }).then(function(shape) {
                addLayer(shape);
                navigateToAnalyze();
            }).fail(function() {
                revertLayer();
            }).always(function() {
                model.enableTools();
                ofg.clearLayers();
            });
        });
    }
}

function clearLayer() {
    App.map.set('areaOfInterest', null);
    return function revertLayer() {
        var previousShape = App.map.previous('areaOfInterest');
        App.map.set('areaOfInterest', previousShape);
    };
}

function addLayer(shape) {
    App.map.set('areaOfInterest', shape);
}

function drawPolygon() {
    var defer = $.Deferred(),
        map = App.getLeafletMap(),
        tool = new L.Draw.Polygon(map),
        clearEvents = function() {
            map.off('draw:created');
            map.off('draw:drawstop');
        },
        doneDrawing = function(e) {
            var layer = e.layer,
                shape = layer.toGeoJSON();
            clearEvents();
            defer.resolve(shape);
        },
        cancelDrawing = function() {
            clearEvents();
            defer.reject();
        },
        drawOpts = {};

    map.on('draw:created', doneDrawing);
    map.on('draw:drawstop', cancelDrawing);
    tool.enable();

    return defer.promise();
}

function placeMarker() {
    var defer = $.Deferred(),
        map = App.getLeafletMap(),
        tool = new L.Draw.Marker(map),
        clearEvents = function() {
            map.off('draw:created');
            map.off('draw:drawstop');
        },
        doneDrawing = function(e) {
            var latlng = e.layer.getLatLng();
            clearEvents();
            defer.resolve(latlng);
        },
        cancelDrawing = function() {
            clearEvents();
            defer.reject();
        },
        drawOpts = {};

    map.on('draw:created', doneDrawing);
    map.on('draw:drawstop', cancelDrawing);
    tool.enable();

    return defer.promise();
}

function navigateToAnalyze() {
    router.navigate('analyze', { trigger: true });
}

module.exports = {
    ToolbarView: ToolbarView
};
