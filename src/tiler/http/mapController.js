"use strict";

var step = require('step');
var windshaft = require('windshaft');

var MapConfig = windshaft.model.MapConfig;
var DummyMapConfigProvider = require('../node_modules/windshaft/lib/windshaft/models/providers/dummy_mapconfig_provider');

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

module.exports = MapController;


MapController.prototype.register = function(app) {
    app.get(app.base_url + '/:z/:x/:y@:scale_factor?x.:format(png|grid\.json)', this.tile.bind(this));
    app.get(app.base_url + '/:z/:x/:y.:format(png|grid\.json)', this.tile.bind(this));
    app.options(app.base_url, this.cors.bind(this));
};

// send CORS headers when client send options.
MapController.prototype.cors = function(req, res, next) {
    this._app.doCORS(res, "Content-Type");
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
                        interactivity: req.params.interactivity
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
            return null;
        },
        function finish(err) {
            if ( err ) {
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

        this._app.sendError(res, { errors: ['' + errMsg] }, this._app.findStatusCode(err), 'TILE', err);
    } else {
        res.send(tile, headers, 200);
    }
};
