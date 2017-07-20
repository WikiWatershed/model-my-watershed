"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    JSZip = require('jszip'),
    L = require('leaflet'),
    Marionette = require('../../shim/backbone.marionette'),
    turfBboxPolygon = require('turf-bbox-polygon'),
    turfDestination = require('turf-destination'),
    turfIntersect = require('turf-intersect'),
    turfKinks = require('turf-kinks'),
    shapefile = require('shapefile'),
    reproject = require('reproject'),
    router = require('../router').router,
    App = require('../app'),
    utils = require('./utils'),
    models = require('./models'),
    coreUtils = require('../core/utils'),
    drawUtils = require('../draw/utils'),
    splashTmpl = require('./templates/splash.html'),
    windowTmpl = require('./templates/window.html'),
    aoiUploadTmpl = require('./templates/aoiUpload.html'),
    drawToolTmpl = require('./templates/drawTool.html'),
    settings = require('../core/settings'),
    modalModels = require('../core/modals/models'),
    modalViews = require('../core/modals/views');

var selectBoundary = 'selectBoundary',
    drawArea = 'drawArea',
    delineateWatershed = 'delineateWatershed',
    aoiUpload = 'aoiUpload',
    freeDraw = 'free-draw',
    squareKm = 'square-km';

var codeToLayer = {}; // code to layer mapping

// The shapefile library relies on a native Promise implementation,
// a polyfill for which is available in the JSZip library
if (!window.Promise) {
    window.Promise = JSZip.external.Promise;
}

function displayAlert(message, alertType) {
    if (message === drawUtils.CANCEL_DRAWING) {
        return;
    }

    var alertView = new modalViews.AlertView({
        model: new modalModels.AlertModel({
            alertMessage: message,
            alertType: alertType
        })
    });

    alertView.render();
}

function actOnUI(datum, bool) {
    var code = datum.code,
        $el = $('#' + code);

    if (bool) {
        $el.prop('disabled', true);
    } else {
        $el.prop('disabled', false);
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
        if (result.watershed.features[0].geometry.type === 'MultiPolygon') {
            d.reject('Unfortunately, the watershed generated at this ' +
                     'location is not available for analysis');
        }
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
    var d = new $.Deferred(),
        selfIntersectingShape = turfKinks(polygon).features.length > 0;

    if (selfIntersectingShape) {
        var errorMsg = 'This watershed shape is invalid because it intersects ' +
                       'itself. Try drawing the shape again without crossing ' +
                       'over its own border.';
        d.reject(errorMsg);
    } else if (!utils.isValidForAnalysis(polygon)) {
        var maxArea = utils.MAX_AREA.toLocaleString(),
            selectedBoundingBoxArea = Math.floor(utils.shapeBoundingBoxArea(polygon)).toLocaleString(),
            message = 'Sorry, the bounding box of the area you have delineated is too large ' +
                      'to analyze or model. ' + selectedBoundingBoxArea + ' km² were ' +
                      'selected, but the maximum supported size is ' +
                      'currently ' + maxArea + ' km².';
        d.reject(message);
    } else {
        d.resolve(polygon);
    }
    return d.promise();
}

function validatePointWithinDataSourceBounds(latlng, dataSource) {
    var point = L.marker(latlng).toGeoJSON(),
        d = $.Deferred(),
        perimeter = null,
        point_outside_message = null;

    switch (dataSource) {
        case utils.DRB:
            var streamLayers = settings.get('stream_layers');
            perimeter = _.findWhere(streamLayers, {code: 'drb_streams_v2'}).perimeter;
            point_outside_message = 'Selected point is outside the Delaware River Basin';
            break;
        case utils.NHD:
            // Bounds checking disabled until #1656 is complete.
            d.resolve(latlng);
            return d.promise();
        default:
            var message = 'Not a valid data source';
            d.reject(message);
            return d.promise();
    }

    if (turfIntersect(point, perimeter)) {
        d.resolve(latlng);
    } else {
        d.reject(point_outside_message);
    }
    return d.promise();
}

var DrawWindow = Marionette.LayoutView.extend({
    // model: ToolbarModel,

    template: windowTmpl,

    id: 'draw-window',

    regions: {
        selectBoundaryRegion: '#select-boundary-region',
        drawAreaRegion: '#draw-area-region',
        watershedDelineationRegion: '#watershed-delineation-region',
        uploadFileRegion: '#upload-file-region'
    },

    initialize: function() {
        var map = App.getLeafletMap(),
            ofg = L.featureGroup();
        this.model.set('outlineFeatureGroup', ofg);
        map.addLayer(ofg);
        this.rwdTaskModel = new models.RwdTaskModel();
    },

    onShow: function() {
        var self = this,
            resetDrawingState = function() {
                self.resetDrawingState();
            };

        this.selectBoundaryRegion.show(new SelectBoundaryView({
            model: this.model,
            resetDrawingState: resetDrawingState
        }));

        this.drawAreaRegion.show(new DrawAreaView({
            model: this.model,
            resetDrawingState: resetDrawingState
        }));

        this.watershedDelineationRegion.show(
            new WatershedDelineationView({
                model: this.model,
                resetDrawingState: resetDrawingState,
                rwdTaskModel: this.rwdTaskModel
            })
        );

        this.uploadFileRegion.show(new AoIUploadView({ model: this.model }));
    },

    resetDrawingState: function() {
        this.model.clearRwdClickedPoint(App.getLeafletMap());
        this.rwdTaskModel.reset();
        this.model.reset();

        utils.cancelDrawing(App.getLeafletMap());
        clearAoiLayer();
        clearBoundaryLayer(this.model);
    }
});

var SplashWindow = Marionette.ItemView.extend({
    template: splashTmpl,

    id: 'splash-window',

    ui: {
        'start': '#get-started',
        'openProject': '#splash-open-project',
    },

    initialize: function() {
        clearAoiLayer();
    },

    events: {
        'click @ui.start': 'moveToDraw',
        'click @ui.openProject': 'openOrLogin',
    },

    moveToDraw: function() {
        router.navigate('/draw', {trigger: true});
    },

    openOrLogin: function() {
        if (App.user.get('guest')) {
            App.showLoginModal(function() {
                router.navigate('/projects', {trigger: true});
            });
        } else {
            router.navigate('/projects', {trigger: true});
        }
    }
});

var AoIUploadView = Marionette.ItemView.extend({
    template: aoiUploadTmpl,

    ui: {
        drawToolButton: '.draw-tool-button',
        selectFileInput: '#draw-tool-file-upload-input',
        selectFileButton: '#draw-tool-file-upload-button',
        resetDrawButton: '.reset-draw-button'
    },

    events: {
        'dragenter': 'stopEvents',
        'dragover': 'stopEvents',
        'click @ui.selectFileButton': 'onSelectFileButtonClick',
        'change @ui.selectFileInput': 'selectFile',
        'click @ui.drawToolButton': 'selectDrawToolItem',
        'click @ui.resetDrawButton': 'reset'
    },

    modelEvents: {
        change: 'render'
    },

    initialize: function() {
        this.id = aoiUpload;
    },

    reset: function() {
        this.model.reset();
    },

    selectDrawToolItem: function() {
        this.model.selectDrawToolItem(this.id, this.id);
    },

    onRender: function() {
        // Using jQuery to bind this event prevents the file
        // data from being attached to the event object,
        // so we behind it manually once the view has been rendered
        // and attached to the DOM.
        var dropbox = document.getElementById("dropbox");
        if (dropbox) {
            dropbox.addEventListener("drop", _.bind(this.drop, this), false);
        }
    },

    onSelectFileButtonClick: function() {
        this.ui.selectFileInput.click();
    },

    selectFile: function(e) {
        this.validateAndReadFile(e.target.files[0]);
    },

    drop: function(e) {
        this.stopEvents(e);
        this.validateAndReadFile(e.dataTransfer.files[0]);
    },

    validateAndReadFile: function(file) {
        var validationInfo = this.validateFile(file);

        if (validationInfo.valid) {
            this.readFile(file, validationInfo.extension);
        } else {
            displayAlert(validationInfo.message, modalModels.AlertTypes.error);
        }

        // If the upload fails, the user may choose to upload another file.
        // Clear the current file input so that the `change` event will fire
        // on the second time.
        this.ui.selectFileInput.val(null);
    },

    validateFile: function(file) {
        // File must be less than 200 mb
        if (file.size > 200000000) {
            return {
                valid: false,
                message: 'File is too large. It must be smaller than 200 MB.'
            };
        }

        // Only shapefiles and geojson are supported
        var fileExtension = file.name.substr(file.name.lastIndexOf(".") + 1).toLowerCase();
        if (!_.includes(['zip', 'json', 'geojson'], fileExtension)) {
            return {
                valid: false,
                message: 'File is not supported. Only shapefiles (.zip) and GeoJSON (.json, .geojson) are supported.'
            };
        }

        return {
            valid: true,
            extension: fileExtension
        };
    },

    stopEvents: function(e) {
        e.stopPropagation();
        e.preventDefault();
    },

    readFile: function(file, fileExtension){
        var reader = new FileReader();
        var self = this;

        reader.onload = function() {
            if (reader.readyState !== 2 || reader.error) {
                return;
            } else {
                if (fileExtension === 'zip') {
                    self.handleShpZip(reader.result);
                } else if (fileExtension === 'json' || fileExtension === 'geojson') {
                    self.handleGeoJSON(reader.result);
                }
            }
        };

        if (fileExtension === 'zip') {
            reader.readAsArrayBuffer(file);
        } else if (fileExtension === 'json' || fileExtension === 'geojson') {
            reader.readAsText(file);
        }
    },

    handleGeoJSON: function(jsonString) {
        var geojson = JSON.parse(jsonString);

        this.addPolygonToMap(geojson.features[0]);
    },

    handleShpZip: function(zipfile) {
        var self = this;

        drawUtils.loadAsyncShpFilesFromZip(zipfile)
            .then(function(shpAndPrj) {
                var shp = shpAndPrj[0],
                    prj = shpAndPrj[1];

                self.reprojectAndAddFeature(shp, prj);
            })
            .catch(self.handleShapefileError);
    },

    reprojectAndAddFeature: function(shp, prj) {
        // Read in and add the first feature to the map in geographic coordinates
        var self = this;
        shapefile.open(shp)
            .then(function(source) {
                source
                    .read()
                    .then(function parse(result) {
                        if (result.done) { return; }
                        var geom = reproject.toWgs84(result.value, prj);
                        self.addPolygonToMap(geom);
                        return source.read();
                    })
                    .then(function hasMore(result) {
                        if (!result.done) {
                            var msg = "This shapefile has multiple features and we've used just the first one.  If you'd like to use a different feature, please create a shapefile containing just that single one.";
                            displayAlert(msg, modalModels.AlertTypes.warn);
                        }
                    })
                    .catch(self.handleShapefileError);
            })
            .catch(self.handleShapefileError);
    },

    handleShapefileError: function(err) {
        var errorMsg = 'Unable to parse shapefile. Please ensure it is a valid shapefile with projection information.',
            msg = errorMsg;

        if (typeof err === "string") {
            msg = err;
        }
        displayAlert(msg, modalModels.AlertTypes.error);
    },

    addPolygonToMap: function(polygon) {
        validateShape(polygon)
            .done(function() {
                clearAoiLayer();
                addLayer(polygon);
                navigateToAnalyze();
            })
            .fail(function(message) {
                addLayer(polygon);
                displayAlert(message, modalModels.AlertTypes.error);
            });
    }
});

var DrawToolBaseView = Marionette.ItemView.extend({
    template: drawToolTmpl,

    ui: {
        drawToolButton: '.draw-tool-button',
        drawToolItemButton: '.draw-pane-list-item-button',
        helptextIcon: 'a.help',
        resetButton: '.reset-draw-button'
    },

    events: {
        'click @ui.drawToolItemButton': 'onClickItem',
        'click @ui.drawToolButton': 'openDrawTool',
        'click @ui.resetButton': 'resetDrawingState'
    },

    modelEvents: {
        'change': 'render'
    },

    initialize: function(options) {
        this.resetDrawingState = options.resetDrawingState;
        var self = this;

        $(document).on('mouseup', function(e) {
            var isTargetOutside = $(e.target).parents('.dropdown-menu').length === 0;
            if (isTargetOutside && self.model.get('openDrawTool') === self.id) {
                self.model.closeDrawTool();
            }
        });
    },

    templateHelpers: function() {
        var activeDrawTool = this.model.get('activeDrawTool'),
            activeDrawToolItem = this.model.get('activeDrawToolItem'),
            currentZoomLevel = App.getLeafletMap().getZoom(),
            openDrawTool = this.model.get('openDrawTool'),
            activeTitle = null,
            activeDirections = null,
            toolData = this.getToolData();

        if (activeDrawTool === toolData.id) {
            var activeItem = _.find(toolData.items, function(item) {
                return item.id === activeDrawToolItem;
            });
            activeTitle = activeItem.title;
            activeDirections = activeItem.directions;
        }

        return {
            toolData: toolData,
            activeTitle: activeTitle,
            activeDirections: activeDirections,
            currentZoomLevel: currentZoomLevel,
            openDrawTool: openDrawTool
        };
    },

    onShow: function() {
        this.activatePopovers();
    },

    onRender: function() {
        this.activatePopovers();
    },

    openDrawTool: function() {
        this.model.openDrawTool(this.id);
    },

    activatePopovers: function() {
        this.ui.helptextIcon.popover({
            placement: 'top',
            trigger: 'focus'
        });
    }
});

var SelectBoundaryView = DrawToolBaseView.extend({
    $label: $('#boundary-label'),

    initialize: function(options) {
        DrawToolBaseView.prototype.initialize.call(this, options);

        var map = App.getLeafletMap(),
            ofg = this.model.get('outlineFeatureGroup'),
            types = this.model.get('predefinedShapeTypes');

        ofg.on('layerremove', _.bind(this.clearLabel, this));
        coreUtils.zoomToggle(map, types, actOnUI, actOnLayer);
        this.id = selectBoundary;
    },

    getToolData: function() {
        var toolData = {
                id: this.id,
                title: 'Select boundary',
                info: 'Choose a predefined boundary from several types'
            },
            shapeTypes = this.model.get('predefinedShapeTypes'),
            directions = 'Click on a boundary.',
            items = _.map(shapeTypes, function(shapeType) {
                return {
                    id: shapeType.code,
                    title: shapeType.display,
                    info: shapeType.helptext,
                    minZoom: shapeType.minZoom,
                    directions: directions
                };
            });

        toolData.items = items;
        return toolData;
    },

    onClickItem: function(e) {
        var itemId = e.currentTarget.id,
            shapeTypes = this.model.get('predefinedShapeTypes'),
            shapeType = _.find(shapeTypes, function(shapeType) {
                return shapeType.code === itemId;
            });

        this.resetDrawingState();
        clearAoiLayer();
        this.changeOutlineLayer(
            shapeType.url, shapeType.code, shapeType.short_display,
            shapeType.minZoom);
        e.preventDefault();

        this.model.selectDrawToolItem(this.id, itemId);
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

var DrawAreaView = DrawToolBaseView.extend({
    initialize: function(options) {
        DrawToolBaseView.prototype.initialize.call(this, options);

        this.id = drawArea;
    },

    getToolData: function() {
        return {
            id: this.id,
            title: 'Draw area',
            info: 'Free draw an area or place a square kilometer',
            items: [
                {
                    id: freeDraw,
                    title: 'Free draw',
                    info: 'Free draw an area of interest polygon, by clicking ' +
                          'on the map and repeatedly clicking at boundary corners. ' +
                          'Close the polygon by double clicking on the last ' +
                          'point or clicking on the first point.<br />' +
                          'For more information, see ' +
                          '<a href=\'https://wikiwatershed.org/documentation/mmw-tech/#draw-area\' target=\'_blank\' rel=\'noreferrer noopener\'>' +
                          'Model My Watershed Technical Documentation on ' +
                          'Draw Area.</a>',
                    minZoom: 0,
                    directions: 'Draw a boundary.'
                },
                {
                    id: squareKm,
                    title: 'Square Km',
                    info: 'Draw a perfect square with one kilometer sides, by ' +
                          'clicking on the map where the square’s center will be.<br />' +
                          'For more information, see ' +
                          '<a href=\'https://wikiwatershed.org/documentation/mmw-tech/#draw-area\' target=\'_blank\' rel=\'noreferrer noopener\'>' +
                          'Model My Watershed Technical Documentation on ' +
                          'Draw Area.</a>',
                    minZoom: 0,
                    directions: 'Click a point.'
                }
            ]
        };
    },

    onClickItem: function(e) {
        this.resetDrawingState();

        var itemId = e.currentTarget.id;
        switch (itemId) {
            case freeDraw:
                this.enableDrawArea();
                break;
            case squareKm:
                this.enableStampTool();
                break;
        }

        this.model.selectDrawToolItem(this.id, itemId);
    },

    enableDrawArea: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

        utils.drawPolygon(map)
            .then(validateShape)
            .then(function(shape) {
                addLayer(shape);
                navigateToAnalyze();
            }).fail(function(message) {
                revertLayer();
                displayAlert(message, modalModels.AlertTypes.error);
                self.model.reset();
            });
    },

    enableStampTool: function() {
        var self = this,
            map = App.getLeafletMap(),
            revertLayer = clearAoiLayer();

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
        }).fail(function(message) {
            revertLayer();
            displayAlert(message, modalModels.AlertTypes.error);
            self.model.reset();
        });
    }
});

var WatershedDelineationView = DrawToolBaseView.extend({
    initialize: function(options) {
        DrawToolBaseView.prototype.initialize.call(this, options);
        this.id = delineateWatershed;
        this.rwdTaskModel = options.rwdTaskModel;
    },

    getToolData: function() {
        return {
            id: this.id,
            title: 'Delineate watershed',
            info: 'Automatically delineate a watershed from any point',
            items: [
                {
                    id: utils.NHD,
                    dataSource: utils.NHD,
                    title: 'Continental US Medium Resolution',
                    info: 'Click on the map to select the nearest downhill ' +
                          'point on the medium resolution flow lines of the ' +
                          'National Hydrography Dataset (NHDplus v2). The ' +
                          'watershed area upstream of this point is ' +
                          'automatically delineated using the 30 m resolution ' +
                          'flow direction grid.<br />' +
                          'For more information, see ' +
                          '<a href=\'https://wikiwatershed.org/documentation/mmw-tech/#delineate-watershed\' target=\'_blank\' rel=\'noreferrer noopener\'>' +
                          'Model My Watershed Technical Documentation on ' +
                          'Delineate Watershed.</a>',
                    shapeType: 'stream',
                    snappingOn: true,
                    minZoom: 0,
                    directions: 'Click a point to delineate a watershed.'
                },
                {
                    id: utils.DRB,
                    dataSource: utils.DRB,
                    title: 'Delaware High Resolution',
                    info: 'Click on the map to select the nearest downhill ' +
                          'point on our Delaware River Basin high resolution ' +
                          'stream network. The watershed area upstream of this ' +
                          'point is automatically delineated using the 10 m ' +
                          'resolution national elevation model.<br />' +
                          'For more information, see ' +
                          '<a href=\'https://wikiwatershed.org/documentation/mmw-tech/#delineate-watershed\' target=\'_blank\' rel=\'noreferrer noopener\'>' +
                          'Model My Watershed Technical Documentation on ' +
                          'Delineate Watershed.</a>',
                    shapeType: 'stream',
                    snappingOn: true,
                    minZoom: 0,
                    directions: 'Click a point to delineate a watershed.'
                }
            ]
        };
    },

    onClickItem: function(e) {
        var self = this,
            itemId = e.currentTarget.id,
            map = App.getLeafletMap(),
            toolData = this.getToolData(),
            item = _.find(toolData.items, function(item) {
                return item.id === itemId;
            }),
            itemName = item.title,
            snappingOn = item.snappingOn,
            dataSource = item.dataSource;

        this.resetDrawingState();
        this.model.selectDrawToolItem(this.id, itemId);

        clearAoiLayer();
        this.model.set('pollError', false);

        utils.placeMarker(map)
            .then(function(latlng) {
                return validatePointWithinDataSourceBounds(latlng, dataSource);
            })
            .then(function(latlng) {
                // Set `rwd-original-point` in the model so it can be
                // removed when the deferred chain completes.
                var rwdClickedPoint = L.marker(latlng, {
                    icon: drawUtils.createRwdMarkerIcon('original-point')
                }).bindPopup('Original clicked outlet point');
                self.model.set('rwd-original-point', rwdClickedPoint);
                rwdClickedPoint.addTo(map);
                return latlng;
            })
            .then(function(latlng) {
                return self.delineateWatershed(latlng, snappingOn, dataSource);
            })
            .then(function(result) {
                return self.drawWatershed(result, itemName);
            })
            .then(validateRwdShape)
            .done(function() {
                navigateToAnalyze();
            })
            .fail(function(message) {
                displayAlert(message, modalModels.AlertTypes.warn);
                self.resetDrawingState();
            })
            .always(function() {
                self.model.clearRwdClickedPoint(map);
            });
    },

    delineateWatershed: function(latlng, snappingOn, dataSource) {
        var self = this,
            point = L.marker(latlng).toGeoJSON(),
            deferred = $.Deferred();

        var taskHelper = {
            onStart: function() {
                self.model.set('polling', true);
            },

            pollSuccess: function(response) {
                self.model.set('polling', false);

                var result;
                try {
                    result = JSON.parse(response.result);
                } catch (ex) {
                    return this.pollFailure();
                }

                if (result.watershed) {
                    // Convert watershed to MultiPolygon to pass shape validation.
                    result.watershed = coreUtils.toMultiPolygon(result.watershed);
                }
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
                'snappingOn': snappingOn,
                'dataSource': dataSource,
            }
        };

        this.rwdTaskModel.start(taskHelper);
        return deferred;
    },

    drawWatershed: function(result, itemName) {
        var inputPoints = result.input_pt;

        // add additional aoi points
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

        return result;
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
        App.restApi
            .getPolygon({
                layerCode: layerCode,
                shapeId: shapeId
            })
            .then(validateShape)
            .then(function(shape) {
                var wkaoi = layerCode + '__' + shapeId;
                addLayer(shape, shapeName, layerName, wkaoi);
                clearBoundaryLayer(model);
                navigateToAnalyze();
                deferred.resolve();
            }).fail(function() {
                console.log('Shape endpoint failed');
                deferred.reject();
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
            deferred.reject();
        }
    }

    return deferred;
}

function clearAoiLayer() {
    var projectNumber = App.projectNumber,
        previousShape = App.map.get('areaOfInterest'),
        previousShapeName = App.map.get('areaOfInterestName');

    App.map.set({
        'areaOfInterest': null,
        'areaOfInterestName': '',
        'wellKnownAreaOfInterest': null,
    });
    App.projectNumber = undefined;
    App.map.setDrawSize(false);
    App.clearAnalyzeCollection();

    return function revertLayer() {
        App.map.set({
            'areaOfInterest': previousShape,
            'areaOfInterestName': previousShapeName
        });
        App.projectNumber = projectNumber;
    };
}

function clearBoundaryLayer(model) {
    var ofg = model.get('outlineFeatureGroup');
    if (ofg) {
        ofg.clearLayers();
    }
}

function addLayer(shape, name, label, wkaoi) {
    if (!name) {
        name = 'Selected Area';
    }

    var labelDisplay = label ? ', ' + label : '',
        displayName = name + labelDisplay;

    App.map.set({
        'areaOfInterest': shape,
        'areaOfInterestName': displayName,
        'wellKnownAreaOfInterest': wkaoi,
    });
}

function navigateToAnalyze() {
    router.navigate('analyze', { trigger: true });
}

module.exports = {
    SplashWindow: SplashWindow,
    DrawWindow: DrawWindow,
    getShapeAndAnalyze: getShapeAndAnalyze,
    addLayer: addLayer,
    clearAoiLayer: clearAoiLayer,
    selectBoundary: selectBoundary,
    drawArea: drawArea,
    delineateWatershed: delineateWatershed,
    aoiUpload: aoiUpload,
    freeDraw: freeDraw,
    squareKm: squareKm
};
