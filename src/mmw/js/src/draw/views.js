"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
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
    stampTemplate = require('./templates/kmStamp.html'),
    resetDrawTmpl = require('./templates/reset.html'),
    streamSliderTmpl = require('./templates/streamSlider.html'),
    placeMarkerTmpl = require('./templates/placeMarker.html'),
    settings = require('../core/settings');

// Responsible for loading and displaying tools for selecting and drawing
// shapes on the map.
var ToolbarView = Marionette.LayoutView.extend({
    template: toolbarTmpl,

    className: 'draw-tools-container',

    regions: {
        selectTypeRegion: '#select-area-region',
        drawAreaRegion: '#draw-area-region',
        placeMarkerRegion: '#place-marker-region',
        resetRegion: '#reset-draw-region',
        streamRegion: '#stream-slider-region',
        stampRegion: '#one-km-stamp-region'
    },

    initialize: function() {
        var map = App.getLeafletMap(),
            ofg = L.featureGroup(),
            sfg = L.featureGroup();
        this.model.set('outlineFeatureGroup', ofg);
        this.model.set('streamFeatureGroup', sfg);
        map.addLayer(ofg);
        map.addLayer(sfg);
    },

    onDestroy: function() {
        var map = App.getLeafletMap(),
            ofg = this.model.get('outlineFeatureGroup'),
            sfg = this.model.get('streamFeatureGroup');
        map.removeLayer(ofg);
        map.removeLayer(sfg);
        this.model.set('outlineFeatureGroup', null);
        this.model.set('streamFeatureGroup', null);
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
        this.streamRegion.show(new StreamSliderView({
            model: this.model
        }));
        this.stampRegion.show(new OneKmStampView({
            model: this.model
        }));
    }
});

var SelectAreaView = Marionette.ItemView.extend({
    $label: $('#boundary-label'),

    ui: {
        'items': '[data-endpoint]',
        'button': '#predefined-shape',
    },

    events: {
        'click @ui.items': 'onItemClicked'
    },

    modelEvents: {
        'change': 'render',
        'change:toolsEnabled': 'removeBoundaryLayer'
    },

    initialize: function() {
        var ofg = this.model.get('outlineFeatureGroup');
        ofg.on('layerremove', _.bind(this.clearLabel, this));
    },

    onItemClicked: function(e) {
        var $el = $(e.target),
            endpoint = $el.data('endpoint'),
            tableId = $el.data('tableid');

        clearAoiLayer();
        this.changeOutlineLayer(endpoint, tableId);
        e.preventDefault();
    },

    getTemplate: function() {
        var types = this.model.get('predefinedShapeTypes');
        return !types ? loadingTmpl : selectTypeTmpl;
    },

    changeOutlineLayer: function(endpoint, tableId) {
        var self = this,
            ofg = self.model.get('outlineFeatureGroup');

        // Go about the business of adding the ouline and UTFgrid layers.
        if (endpoint && tableId !== undefined) {
            var ol = new L.TileLayer(endpoint + '.png'),
                grid = new L.UtfGrid(endpoint + '.grid.json?callback={cb}',
                                     {
                                         resolution: 4,
                                         maxRequests: 8
                                     });
            grid.on('click', function(e) {
                getShapeAndAnalyze(e, self.model, ofg, grid, tableId);
            });

            grid.on('mousemove', function(e) {
                self.updateDisplayLabel(e.latlng, e.data.name);
            });

            clearBoundaryLayer(self.model);
            ofg.addLayer(ol);
            ofg.addLayer(grid);

            ol.bringToFront();
        }
    },

    removeBoundaryLayer: function() {
        clearBoundaryLayer(this.model);
    },

    updateDisplayLabel: function(latLng, text) {
        var pos = App.getLeafletMap().latLngToContainerPoint(latLng),
            bufferDist = 10,
            buffer = function(cursorPos) {
                var newPt = _.clone(cursorPos);
                _.forEach(newPt, function(val, key, pt) {
                    pt[key] = val + bufferDist;
                });

                return newPt;
            },
            placement = buffer(pos);

        this.$label
            .text(text)
            .css({ top: placement.y, left: placement.x})
            .show();
    },

    clearLabel: function() {
        this.$label.hide();
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

    onItemClicked: function(e) {
        var self = this,
            map = App.getLeafletMap(),
            itemName = $(e.target).text(),
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

            addLayer(shape, itemName);
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

var StreamSliderView = Marionette.ItemView.extend({
    template: streamSliderTmpl,

    ui: {
        slider: '#stream-slider',
        displayValue: '#stream-value'
    },

    events: {
        'input @ui.slider': 'onSliderDragged',
        'change @ui.slider': 'onSliderChanged'
    },

    initialize: function() {
        this.streamLayers = settings.get('stream_layers');
    },

    onShow: function() {
        this.onSliderDragged();
    },

    getSliderIndex: function() {
        return parseInt(this.ui.slider.val());
    },

    getSliderDisplay: function() {
        var ind = this.getSliderIndex();
        if (ind === 0) {
            return 'Off';
        } else {
            return this.streamLayers[ind-1].display;
        }
    },

    onSliderDragged: function() {
        // Preview slider value while dragging.
        this.ui.displayValue.text(this.getSliderDisplay());
    },

    onSliderChanged: function() {
        var ind = this.getSliderIndex();
        clearStreamLayer(this.model);
        if (ind > 0) {
            var streamLayer = this.streamLayers[ind-1];
            changeStreamLayer(streamLayer.endpoint, this.model);
        }
    }
});

var OneKmStampView = Marionette.ItemView.extend({
    template: stampTemplate,

    ui: {
        stampButton: '#one-km-stamp',
    },

    events: {
        'click @ui.stampButton': 'enableStampTool'
    },

    enableStampTool: function(evnt) {
    }
});

function clearStreamLayer(model) {
    model.get('streamFeatureGroup').clearLayers();
}

function changeStreamLayer(endpoint, model) {
    var sfg = model.get('streamFeatureGroup'),
        sl = new L.TileLayer(endpoint + '.png');

    sfg.addLayer(sl);
    sl.bringToFront();
}

function getShapeAndAnalyze(e, model, ofg, grid, tableId) {
    // The shapeId might not be available at the time of the click
    // because the UTF Grid layer might not be loaded yet, so
    // we poll for it.
    var pollInterval = 200,
        maxPolls = 5,
        pollCount = 0,
        deferred = $.Deferred(),
        shapeName = e.data && e.data.name ? e.data.name : null,
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
            addLayer(shape, shapeName);
            clearBoundaryLayer(model);
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
            model.enableTools();
            deferred.reject();
        }
    }

    return deferred;
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

function addLayer(shape, name) {
    if (!name) {
        name = 'Selected Area';
    }

    App.map.set('areaOfInterest', shape);
    App.map.set('areaOfInterestName', name);
}

function navigateToAnalyze() {
    router.navigate('analyze', { trigger: true });
}

module.exports = {
    ToolbarView: ToolbarView,
    getShapeAndAnalyze: getShapeAndAnalyze
};
