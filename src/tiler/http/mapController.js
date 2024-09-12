'use strict';

var step = require('step');
var windshaft = require('windshaft');
var _ = require('underscore');
var utils = require('./utils');

var MapConfig = windshaft.model.MapConfig;
var DummyMapConfigProvider = require('windshaft/lib/windshaft/models/providers/dummy_mapconfig_provider');
var MapStoreMapConfigProvider = windshaft.model.provider.MapStoreMapConfig;

/**
 * @param app
 * @param {MapStore} mapStore
 * @param {MapBackend} mapBackend
 * @param {TileBackend} tileBackend
 * @constructor
 */
function MapController(app, mapStore, mapBackend, tileBackend) {
    this._app = app;
    this.mapStore = mapStore;
    this.mapBackend = mapBackend;
    this.tileBackend = tileBackend;
}

MapController.prototype.register = function(app) {
    var tile = this.tile.bind(this);
    var cors = this.cors.bind(this);

    app.get(app.base_url + '/:z/:x/:y@:scale_factor?x.:format(png|grid\.json)', tile);
    app.get(app.base_url + '/:z/:x/:y.:format(png|grid\.json)', tile);
    app.options(app.base_url, cors);
};

// send CORS headers when client send options.
MapController.prototype.cors = function(req, res, next) {
    this._app.doCORS(res, 'Content-Type');
    return next();
};

MapController.prototype.create = function initLayergroup(req, mapConfig, callback) {
    this.mapBackend.createLayergroup(
        mapConfig, req.params, new DummyMapConfigProvider(mapConfig, req.params), callback
    );
};

// Gets a tile for a given token and set of tile ZXY coords. (OSM style)
MapController.prototype.tile = function(req, res) {
    var self = this;
    var mapConfig;

    this._app.doCORS(res);
    step(
        function mapController$prepareParams() {
            self._app.req2params(req, this);
        },
        function mapController$getMapConfig(err) {
            mapConfig = MapConfig.create({
                layers: [{
                    type: 'mapnik',
                    options: {
                        sql: req.params.sql,
                        cartocss: req.params.style,
                        cartocss_version: '2.0.1',
                        interactivity: req.params.interactivity,
                        geom_column: 'geom',
                    }
                }]
            });
            self.mapStore.load(mapConfig.id(), this);
        },
        function mapController$saveMapConfig(err, layer) {
            if (layer) {
                this(null, layer);
            } else {
                self.create(req, mapConfig, this);
            }
        },
        function mapController$getTile(err, layer) {
            if ( err ) {
                throw err;
            }
            req.params.token = layer.layergroupid;
            self.tileBackend.getTile(new MapStoreMapConfigProvider(self.mapStore, req.params), req.params, this);
        },
        function mapController$finalize(err, tile, headers) {
            self.finalizeGetTileOrGrid(err, req, res, tile, headers);
            utils.cacheTile(req, tile, self._app.cacheBucket);
            return null;
        },
        function finish(err) {
            if ( err ) {
                // TODO Replace with Rollbar
                console.error("windshaft.tiles: " + err);
            }
        }
    );
};

// This function is meant for being called as the very last
// step by all endpoints serving tiles or grids
MapController.prototype.finalizeGetTileOrGrid = function(err, req, res, tile, headers) {
    if (err) {
        // See https://github.com/Vizzuality/Windshaft-cartodb/issues/68
        var errMsg = err.message ? ( '' + err.message ) : ( '' + err );

        // Rewrite mapnik parsing errors to start with layer number
        var matches = errMsg.match("(.*) in style 'layer([0-9]+)'");
        if (matches) {
            errMsg = 'style'+matches[2]+': ' + matches[1];
        }

        var status = err.http_status || statusFromErrorMessage(errMsg);

        utils.sendError(res, { errors: [errMsg] }, status, 'TILE', err);
    } else {
        res.status(200)
            // Add cache header for 30 days
            .set(_.extend(headers, { 'Cache-Control': 'max-age=2592000' }))
            .send(tile);
    }
};

function statusFromErrorMessage(errMsg) {
    // Find an appropriate statusCode based on message
    var statusCode = 400;
    if ( -1 !== errMsg.indexOf('permission denied') ) {
        statusCode = 403;
    }
    else if ( -1 !== errMsg.indexOf('authentication failed') ) {
        statusCode = 403;
    }
    else if (errMsg.match(/Postgis Plugin.*[\s|\n].*column.*does not exist/)) {
        statusCode = 400;
    }
    else if ( -1 !== errMsg.indexOf('does not exist') ) {
        if ( -1 !== errMsg.indexOf(' role ') ) {
            statusCode = 403; // role 'xxx' does not exist
        } else {
            statusCode = 404;
        }
    }
    return statusCode;
}

module.exports = MapController;
