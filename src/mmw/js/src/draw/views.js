"use strict";

var _ = require('lodash'),
    $ = require('jquery'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    router = require('../router'),
    App = require('../app'),
    models = require('./models'),
    toolbarTmpl = require('./templates/toolbar.ejs'),
    loadingTmpl = require('./templates/loading.ejs'),
    selectAreaTmpl = require('./templates/selectArea.ejs'),
    drawAreaTmpl = require('./templates/drawArea.ejs'),
    placeMarkerTmpl = require('./templates/placeMarker.ejs');

// Responsible for loading and displaying tools for selecting and drawing
// shapes on the map.
var ToolbarView = Marionette.LayoutView.extend({
    template: toolbarTmpl,

    regions: {
        selectAreaRegion: '#select-area-region',
        drawAreaRegion: '#draw-area-region',
        placeMarkerRegion: '#place-marker-region'
    },

    onShow: function() {
        this.selectAreaRegion.show(new SelectAreaView({
            model: this.model
        }));
        this.drawAreaRegion.show(new DrawAreaView({
            model: this.model
        }));
        this.placeMarkerRegion.show(new PlaceMarkerView({
            model: this.model
        }));
    }
});

// map.fitBounds((new L.GeoJSON(shape)).getBounds()) or similar does
// not work because getBounds only returns the bounding box around the
// first component of the (possibly multi-component) shape.
function conformMapToShape(shape) {
    function second(pair) {
        return pair[1];
    }

    var map = App.getLeafletMap(),
        flatShape = _.flatten(shape.geometry.coordinates),
        lngs = _.map(flatShape, _.first),
        lats = _.map(flatShape, second),
        minlat = _.min(lats),
        minlng = _.min(lngs),
        maxlat = _.max(lats),
        maxlng = _.max(lngs);

    if (minlat && minlng && maxlat && maxlng) {
        map.fitBounds([[minlat, minlng],
                       [maxlat, maxlng]]);
    } else {
        // if the bounding box of the shape could not be computed, use
        // the bounding box for the US.
        map.fitBounds([[-124.848974, 24.396308],
                       [-66.885444, 49.384358]]);
    }
}

var SelectAreaView = Marionette.ItemView.extend({
    ui: {
        'items': '[data-shape-id]',
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
            shapeId = $el.data('shape-id'),
            revertLayer = clearLayer();
        this.model.disableTools();
        App.restApi.getPolygon({
            id: shapeId
        }).then(function(shape) {
            addLayer(shape);
            navigateToAnalyze();
        }).fail(function() {
            revertLayer();
        }).always(function() {
            self.model.enableTools();
        });

        e.preventDefault();
    },

    getTemplate: function() {
        var shapes = this.model.get('predefinedShapes');
        return !shapes ? loadingTmpl : selectAreaTmpl;
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

function clearLayer(layer) {
    App.map.set('areaOfInterest', null);
    return function revertLayer() {
        var previousShape = App.map.previous('areaOfInterest');
        App.map.set('areaOfInterest', previousShape);
    };
}

function addLayer(shape) {
    App.map.set('areaOfInterest', shape);
    conformMapToShape(shape);
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
