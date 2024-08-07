'use strict';

// Adapted from:
// https://github.com/CartoDB/Windshaft/blob/1a9146e33/examples/http/server.js

var debug = require('debug')('windshaft:server');
var express = require('express');
var RedisPool = require('redis-mpool');
var _ = require('underscore');
var mapnik = require('@carto/mapnik');
var aws = require('aws-sdk');
var stream = require('stream');

// Express Middleware
var morgan = require('morgan');

var windshaft = require('windshaft');

var rollbar = require('./rollbar');
var MapController = require('./mapController.js');

//
// @param opts server options object. Example value:
//     {
//        base_url: '/database/:dbname/table/:table',
//        base_url_notable: '/database/:dbname', // @deprecated
//        base_url_mapconfig: base_url_notable + '/layergroup',
//        req2params: function(req, callback){
//          callback(null,req)
//        },
//        grainstore: {
//          datasource: {
//            user:'postgres', host: '127.0.0.1',
//            port: 5432, geometry_field: 'the_geom_webmercator',
//            srid: 3857
//          }
//        }, //see grainstore npm for other options
//        mapnik: {
//          metatile: 4,
//          bufferSize:64
//        },
//        renderer: {
//          // function to use when getTile fails in a renderer, it enables modifying the default behaviour
//          onTileErrorStrategy: function(err, tile, headers, stats, format, callback) {
//            // allows to change behaviour based on `err` or `format` for instance
//            callback(err, file, headers, stats);
//          },
//          mapnik: {
//
//          },
//          http: {
//
//          },
//        },
//        renderCache: {
//          ttl: 60000, // seconds
//        },
//        redis: {
//          host: '127.0.0.1', port: 6379
//          // or 'pool', for a pre-configured pooler
//          // with interface of node-redis-mpool
//        },
//        https: {
//          key: fs.readFileSync('test/fixtures/keys/agent2-key.pem'),
//          cert: fs.readFileSync('test/fixtures/keys/agent2-cert.pem')
//        }
//     }
//
module.exports = function(opts) {
    opts = opts || {};

    opts.grainstore = opts.grainstore || {};
    opts.grainstore.mapnik_version = mapnikVersion(opts);

    validateOptions(opts);

    bootstrapFonts(opts);

    // initialize express server
    var app = bootstrap(opts);
    addFilters(app, opts);

    var redisPool = makeRedisPool(opts.redis);

    var map_store  = new windshaft.storage.MapStore({
        pool: redisPool,
        expire_time: opts.grainstore.default_layergroup_ttl
    });

    opts.renderer = opts.renderer || {};

    var rendererFactory = new windshaft.renderer.Factory({
        onTileErrorStrategy: opts.renderer.onTileErrorStrategy,
        mapnik: {
            grainstore: opts.grainstore,
            mapnik: opts.renderer.mapnik || opts.mapnik
        },
        torque: opts.renderer.torque,
        http: opts.renderer.http
    });

    // initialize render cache
    var rendererCacheOpts = _.defaults(opts.renderCache || {}, {
        ttl: 60000, // 60 seconds TTL by default
        statsInterval: 60000 // reports stats every milliseconds defined here
    });
    var rendererCache = new windshaft.cache.RendererCache(rendererFactory, rendererCacheOpts);

    var attributesBackend = new windshaft.backend.Attributes();
    var tileBackend = new windshaft.backend.Tile(rendererCache);
    var mapValidatorBackend = new windshaft.backend.MapValidator(tileBackend, attributesBackend);
    var mapBackend = new windshaft.backend.Map(rendererCache, map_store, mapValidatorBackend);

    app.sendError = function(res, err, statusCode, label, tolog) {
      var olabel = '[';
      if ( label ) {
          olabel += label + ' ';
      }
      olabel += 'ERROR]';
      if ( ! tolog ) {
          tolog = err;
      }
      var log_msg = olabel + ' -- ' + statusCode + ': ' + tolog;
      //if ( tolog.stack ) log_msg += '\n' + tolog.stack;
      debug(log_msg); // use console.log for statusCode != 500 ?
      // If a callback was requested, force status to 200
      if ( res.req ) {
        // NOTE: res.req can be undefined when we fake a call to
        //       ourself from POST to /layergroup
        if ( res.req.query.callback ) {
            statusCode = 200;
        }
      }

      res.status(statusCode).send(err);
    };

    app.cacheTile = function(req, tile) {
        try {
            // TODO: Fix caching and turn this back on
            return;

            // Skip caching if environment not setup for it
            if (req.headers.host === 'localhost' || !opts.s3Cache.bucket) {
                return;
            }

            var cleanUrl = req.url[0] === '/' ? req.url.substr(1) : req.url,
                s3Obj = new aws.S3({params: {Bucket: opts.s3Cache.bucket, Key: cleanUrl}}),
                body;

            if (Buffer.isBuffer(tile)) {
                body = new stream.PassThrough();
                body.end(tile);
            } else {
                body = JSON.stringify(tile);
            }

            if (body) {
                s3Obj.upload({Body: body}, function(err) {
                    if (err) {
                        throw (err);
                    }
                });
            }
        } catch (ex) {
            rollbar.handleError(ex, req);
        }
    };

    /*******************************************************************************************************************
     * Routing
     ******************************************************************************************************************/

    var mapController = new MapController(app, map_store, mapBackend, tileBackend, attributesBackend);
    mapController.register(app);

    /*******************************************************************************************************************
     * END Routing
     ******************************************************************************************************************/

    // temporary measure until we upgrade to newer version expressjs so we can check err.status
    app.use(function(err, req, res, next) {
        if (err) {
            if (err.name === 'SyntaxError') {
                app.sendError(res, { errors: [err.name + ': ' + err.message] }, 400, 'JSON', err);
            } else {
                next(err);
            }
        } else {
            next();
        }
    });

    return app;
};

function validateOptions(opts) {
    if (!_.isString(opts.base_url) || !_.isFunction(opts.req2params)) {
        throw new Error('Must initialise Windshaft with: "base_url" URL and req2params function');
    }

    // Be nice and warn if configured mapnik version is != instaled mapnik version
    if (mapnik.versions.mapnik !== opts.grainstore.mapnik_version) {
        console.warn('WARNING: detected mapnik version (' + mapnik.versions.mapnik + ')' +
            ' != configured mapnik version (' + opts.grainstore.mapnik_version + ')');
    }
}

function makeRedisPool(redisOpts) {
    redisOpts = redisOpts || {};
    return redisOpts.pool || new RedisPool(_.extend(redisOpts, {name: 'windshaft:server'}));
}

function bootstrapFonts(opts) {
    // Set carto renderer configuration for MMLStore
    opts.grainstore.carto_env = opts.grainstore.carto_env || {};
    var cenv = opts.grainstore.carto_env;
    cenv.validation_data = cenv.validation_data || {};
    if ( ! cenv.validation_data.fonts ) {
        mapnik.register_system_fonts();
        mapnik.register_default_fonts();
        cenv.validation_data.fonts = _.keys(mapnik.fontFiles());
    }
}

function bootstrap(opts) {
    var app;
    if (_.isObject(opts.https)) {
        // use https if possible
        app = express(opts.https);
    } else {
        // fall back to http by default
        app = express();
    }
    app.enable('jsonp callback');

    if (opts.log_format) {
        app.use(morgan(opts.log_format));
    }

    return app;
}

// set default before/after filters if not set in opts object
function addFilters(app, opts) {

    // Extend windshaft with all the elements of the options object
    _.extend(app, opts);

    // filters can be used for custom authentication, caching, logging etc
    _.defaults(app, {
        // Enable CORS access by web browsers if set
        doCORS: function(res, extraHeaders) {
            if (opts.enable_cors) {
                var baseHeaders = 'X-Requested-With, X-Prototype-Version, X-CSRF-Token';
                if(extraHeaders) {
                    baseHeaders += ', ' + extraHeaders;
                }
                res.header('Access-Control-Allow-Origin', '*');
                res.header('Access-Control-Allow-Headers', baseHeaders);
            }
        }
    });
}

function mapnikVersion(opts) {
    return opts.grainstore.mapnik_version || mapnik.versions.mapnik;
}
