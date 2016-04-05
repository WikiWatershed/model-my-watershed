"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    turfArea = require('turf-area'),
    turfBboxPolygon = require('turf-bbox-polygon'),
    turfDestination = require('turf-destination'),
    turfIntersect = require('turf-intersect'),
    router = require('../router').router,
    App = require('../app'),
    utils = require('./utils'),
    models = require('./models'),
    coreUtils = require('../core/utils'),
    toolbarTmpl = require('./templates/toolbar.html'),
    loadingTmpl = require('./templates/loading.html'),
    selectTypeTmpl = require('./templates/selectType.html'),
    drawTmpl = require('./templates/draw.html'),
    resetDrawTmpl = require('./templates/reset.html'),
    delineationOptionsTmpl = require('./templates/delineationOptions.html'),
    settings = require('../core/settings');

var MAX_AREA = 112700; // About the size of a large state (in km^2)
var codeToLayer = {}; // code to layer mapping

function actOnUI(datum, bool) {
    var code = datum.code,
        $el = $('[data-layer-code="' + code + '"]');

    if (bool) {
        $el.addClass('disabled');
    } else {
        $el.removeClass('disabled');
    }
}

function actOnLayer(datum) {
    $('#boundary-label').hide();
    if (datum.code && codeToLayer[datum.code]) {
        codeToLayer[datum.code]._clearBgBuffer();
    }
}

function validateRwdShape(result) {
    var d = new $.Deferred();
    if (result.watershed) {
        validateShape(result.watershed)
            .done(function() {
                d.resolve(result);
            })
            .fail(d.reject);
    } else {
        var message = 'Unable to delineate watershed at this location';
        d.reject(message);
    }
    return d.promise();
}

function validateShape(polygon) {
    var area = coreUtils.changeOfAreaUnits(turfArea(polygon), 'm<sup>2</sup>', 'km<sup>2</sup>'),
        d = new $.Deferred();

    if (area > MAX_AREA) {
        var message = '';
        message += 'Sorry, your Area of Interest is too large.\n\n';
        message += Math.floor(area) + ' square km were selected, ';
        message += 'but the maximum supported size is currently ';
        message += MAX_AREA + ' square km.';
        d.reject(message);
    } else {
        d.resolve(polygon);
    }
    return d.promise();
}

function validateClickedPointWithinDRB(latlng) {
    var point = L.marker(latlng).toGeoJSON(),
        d = $.Deferred(),
        streamLayers = settings.get('stream_layers'),
        drbPerimeter = _.findWhere(streamLayers, {code:'drb_streams'}).perimeter;
    if (turfIntersect(point, drbPerimeter)) {
        d.resolve(latlng);
    } else {
        var message = 'Selected point is outside the Delaware River Basin';
        d.reject(message);
    }
    return d.promise();
}

// Responsible for loading and displaying tools for selecting and drawing
// shapes on the map.
var ToolbarView = Marionette.LayoutView.extend({
    template: toolbarTmpl,

    className: 'draw-tools-container',

    regions: {
        selectTypeRegion: '#select-area-region',
        drawRegion: '#draw-region',
        watershedDelineationRegion: '#place-marker-region',
        resetRegion: '#reset-draw-region'
    },

    initialize: function() {
        var map = App.getLeafletMap(),
            ofg = L.featureGroup();
        this.model.set('outlineFeatureGroup', ofg);
        map.addLayer(ofg);
        this.rwdTaskModel = new models.RwdTaskModel();
    },

    onDestroy: function() {
        var map = App.getLeafletMap(),
            ofg = this.model.get('outlineFeatureGroup');
        map.removeLayer(ofg);
        this.model.set('outlineFeatureGroup', null);
    },

    onShow: function() {
        var draw_tools = settings.get('draw_tools');
        if (_.contains(draw_tools, 'SelectArea')) {
            this.selectTypeRegion.show(new SelectAreaView({
                model: this.model
            }));
        }
        if (_.contains(draw_tools, 'Draw')) {
            this.drawRegion.show(new DrawView({
                model: this.model
            }));
        }
        if (_.contains(draw_tools, 'PlaceMarker')) {
            this.watershedDelineationRegion.show(new WatershedDelineationView({
                model: this.model,
                rwdTaskModel: this.rwdTaskModel
            }));
        }
        if (_.contains(draw_tools, 'ResetDraw')) {
            this.resetRegion.show(new ResetDrawView({
                model: this.model,
                rwdTaskModel: this.rwdTaskModel
            }));
        }
    }
});

var SelectAreaView = Marionette.ItemView.extend({
    $label: $('#boundary-label'),

    ui: {
        items: '[data-tile-url]',
        button: '#predefined-shape',
        helptextIcon: 'i.split'
    },

    events: {
        'click @ui.items': 'onItemClicked'
    },

    modelEvents: {
        'change': 'render',
        'change:toolsEnabled': 'removeBoundaryLayer'
    },

    initialize: function() {
        var map = App.getLeafletMap(),
            ofg = this.model.get('outlineFeatureGroup'),
            types = this.model.get('predefinedShapeTypes');

        ofg.on('layerremove', _.bind(this.clearLabel, this));
        coreUtils.zoomToggle(map, types, actOnUI, actOnLayer);
    },

    onRender: function() {
        this.ui.helptextIcon.popover({
            trigger: 'hover',
            viewport: '.map-container'
        });
    },

    onItemClicked: function(e) {
        var $el = $(e.currentTarget),
            tileUrl = $el.data('tile-url'),
            layerCode = $el.data('layer-code'),
            shortDisplay = $el.data('short-display'),
            minZoom = $el.data('min-zoom');

        if (!$el.hasClass('disabled')) {
            clearAoiLayer();
            this.changeOutlineLayer(tileUrl, layerCode, shortDisplay, minZoom);
            e.preventDefault();
        }
    },

    getTemplate: function() {
        var types = this.model.get('predefinedShapeTypes');
        return !types ? loadingTmpl : selectTypeTmpl;
    },

    changeOutlineLayer: function(tileUrl, layerCode, shortDisplay, minZoom) {
        var self = this,
            ofg = self.model.get('outlineFeatureGroup');

        // Go about the business of adding the outline and UTFgrid layers.
        if (tileUrl && layerCode !== undefined) {
            var ol = new L.TileLayer(tileUrl + '.png', {minZoom: minZoom || 0}),
                grid = new L.UtfGrid(tileUrl + '.grid.json',
                                     {
                                         minZoom: minZoom,
                                         useJsonP: false,
                                         resolution: 4,
                                         maxRequests: 8
                                     });

            codeToLayer[layerCode] = ol;

            grid.on('click', function(e) {
                getShapeAndAnalyze(e, self.model, ofg, grid, layerCode, shortDisplay);
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

var DrawView = Marionette.ItemView.extend({
    template: drawTmpl,

    ui: {
        drawArea: '#custom-shape',
        drawStamp: '#one-km-stamp',
        helptextIcon: 'i.split'
    },

    events: {
        'click @ui.drawArea': 'enableDrawArea',
        'click @ui.drawStamp': 'enableStampTool'
    },

    modelEvents: {
        'change:toolsEnabled': 'render'
    },

    enableDrawArea: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

        this.model.disableTools();
        utils.drawPolygon(map)
            .then(validateShape)
            .then(function(shape) {
                addLayer(shape);
                navigateToAnalyze();
            }).fail(function() {
                revertLayer();
            }).always(function() {
                self.model.enableTools();
            });
    },

    onShow: function() {
        this.ui.helptextIcon.popover({
            trigger: 'hover',
            viewport: '.map-container'
        });
    },

    enableStampTool: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

        this.model.disableTools();
        utils.placeMarker(map).then(function(latlng) {
            var point = L.marker(latlng).toGeoJSON(),
                halfKmbufferPoints = _.map([-180, -90, 0, 90], function(bearing) {
                    var p = turfDestination(point, 0.5, bearing, 'kilometers');
                    return L.latLng(p.geometry.coordinates[1], p.geometry.coordinates[0]);
                }),
                // Convert the four points into two SW and NE for the bounding
                // box. Do this by splitting the array into two arrays of two
                // points. Then map each array of two to a single point by
                // taking the lat from one and lng from the other.
                swNe = _.map(_.toArray(_.groupBy(halfKmbufferPoints, function(p, i) {
                    // split the array of four in half.
                    return i < 2;
                })), function(pointGroup) {
                    return L.latLng(pointGroup[0].lat, pointGroup[1].lng);
                }),
                bounds = L.latLngBounds(swNe),
                box = turfBboxPolygon(bounds.toBBoxString().split(','));

            // Convert coordinates from using strings to floats so that backend can parse them.
            box.geometry.coordinates[0] = _.map(box.geometry.coordinates[0], function(coord) {
                return [parseFloat(coord[0]), parseFloat(coord[1])];
            });

            addLayer(box, '1 Square Km');
            navigateToAnalyze();
        }).fail(function() {
            revertLayer();
        }).always(function() {
            self.model.enableTools();
        });
    }
});

var WatershedDelineationView= Marionette.ItemView.extend({
    template: delineationOptionsTmpl,

    ui: {
        items: '[data-shape-type]',
        button: '#delineate-shape',
        helptextIcon: 'i.split'
    },

    events: {
        'click @ui.items': 'onItemClicked'
    },

    onShow: function() {
        this.ui.helptextIcon.popover({
            trigger: 'hover',
            viewport: '.map-container'
        });
    },

    modelEvents: {
        'change:toolsEnabled': 'render',
        'change:polling': 'render',
        'change:pollError': 'render'
    },

    initialize: function(options) {
        this.rwdTaskModel = options.rwdTaskModel;
    },

    onItemClicked: function(e) {
        var self = this,
            map = App.getLeafletMap(),
            $item = $(e.currentTarget),
            itemName = $item.text(),
            snappingOn = !!$item.data('snapping-on'),
            revertLayer = clearAoiLayer();

        this.model.set('pollError', false);

        this.model.disableTools();
        utils.placeMarker(map)
             .then(validateClickedPointWithinDRB)
             .then(function(latlng) {
                var point = L.marker(latlng).toGeoJSON(),
                    deferred = $.Deferred();

                var taskHelper = {
                    onStart: function() {
                        self.model.set('polling', true);
                    },

                    pollSuccess: function(response) {
                        self.model.set('polling', false);
                        var result = JSON.parse(response.result);
                        deferred.resolve(result);
                    },

                    pollFailure: function(response) {
                        self.model.set({
                            pollError: true,
                            polling: false
                        });
                        console.log(response.error);
                        var message = 'Unable to delineate watershed at ' +
                                      'this location';
                        deferred.reject(message);
                    },

                    pollEnd: function() {
                        self.model.set('polling', false);
                    },

                    startFailure: function() {
                        self.model.set({
                            pollError: true,
                            polling: false
                        });
                        var message = 'Unable to delineate watershed';
                        deferred.reject(message);
                    },

                    postData: {
                        'location': JSON.stringify([
                            point.geometry.coordinates[1],
                            point.geometry.coordinates[0]
                        ]),
                        'snappingOn': snappingOn
                    }
                };

                self.rwdTaskModel.start(taskHelper);
                return deferred;
            })
            .then(validateRwdShape)
            .done(function(result) {
                var inputPoints = result.input_pt;
                // add additional aoi points:w
                if (inputPoints) {
                    var properties = inputPoints.features[0].properties;

                    // If the point was snapped, there will be the original
                    // point as attributes
                    if (properties.Dist_moved) {
                        inputPoints.features.push(
                            makePointGeoJson([properties.Lon, properties.Lat], {
                                original: true
                            })
                        );
                    }
                    App.map.set({
                        'areaOfInterestAdditionals': inputPoints
                    });
                }

                // Add Watershed AoI layer
                addLayer(result.watershed, itemName);
                navigateToAnalyze();
            })
            .fail(function(message) {
                revertLayer();
                if (message) {
                    window.alert(message);
                }
            })
            .always(function() {
                self.model.enableTools();
            });
    }
});

var ResetDrawView = Marionette.ItemView.extend({
    template: resetDrawTmpl,

    ui: { 'reset': 'button' },

    events: { 'click @ui.reset': 'resetDrawingState' },

    initialize: function(options) {
        this.rwdTaskModel = options.rwdTaskModel;
    },

    resetDrawingState: function() {
        this.rwdTaskModel.reset();
        this.model.set({
            polling: false,
            pollError: false
        });
        this.model.enableTools();

        utils.cancelDrawing(App.getLeafletMap());
        clearAoiLayer();
        clearBoundaryLayer(this.model);
    }
});

function makePointGeoJson(coords, props) {
    return {
        geometry: {
            coordinates: coords,
            type: 'Point'
        },
        properties: props,
        type: 'Feature'
    };
}

function getShapeAndAnalyze(e, model, ofg, grid, layerCode, layerName) {
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
            layerCode: layerCode,
            shapeId: shapeId})
            .then(validateShape)
            .then(function(shape) {
                addLayer(shape, shapeName, layerName);
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
    var projectNumber = App.projectNumber;

    App.map.set('areaOfInterest', null);
    App.projectNumber = undefined;
    App.map.setDrawSize(false);

    return function revertLayer() {
        var previousShape = App.map.previous('areaOfInterest');
        App.map.set('areaOfInterest', previousShape);
        App.projectNumber = projectNumber;
    };
}

function clearBoundaryLayer(model) {
    var ofg = model.get('outlineFeatureGroup');
    if (ofg) {
        ofg.clearLayers();
    }
}

function addLayer(shape, name, label) {
    if (!name) {
        name = 'Selected Area';
    }

    var displayName = (label ? label+=': ' : '') + name;

    App.map.set({
        'areaOfInterest': shape,
        'areaOfInterestName': displayName
    });
}

function navigateToAnalyze() {
    router.navigate('analyze', { trigger: true });
}

module.exports = {
    ToolbarView: ToolbarView,
    getShapeAndAnalyze: getShapeAndAnalyze
};
