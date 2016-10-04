var aws = require('aws-sdk'),
    Windshaft = require('windshaft'),
    healthCheck = require('./healthCheck'),
    rollbar = require('rollbar'),
    fs = require('fs'),
    stream = require('stream'),
    styles = fs.readFileSync('styles.mss', { encoding: 'utf8' });

var dbUser = process.env.MMW_DB_USER,
    dbPass = process.env.MMW_DB_PASSWORD,
    dbHost = process.env.MMW_DB_HOST,
    dbName = process.env.MMW_DB_NAME,
    dbPort = process.env.MMW_DB_PORT,
    redisHost = process.env.MMW_CACHE_HOST,
    redisPort = process.env.MMW_CACHE_PORT,
    tileCacheBucket = process.env.MMW_TILECACHE_BUCKET,
    stackType = process.env.MMW_STACK_TYPE,
    rollbarAccessToken = process.env.ROLLBAR_SERVER_SIDE_ACCESS_TOKEN;

var NHD_QUALITY_TSS_MAP = {
    'L1': [0,50],
    'L2': [50,100],
    'L3': [100,150],
    'L4': [150,200]
};

var NHD_QUALITY_TN_MAP = {
    'L1': [0,1],
    'L2': [1,2],
    'L3': [2,3],
    'L4': [3,4]
};

var NHD_QUALITY_TP_MAP = {
    'L1': [0,0.03],
    'L2': [0.03,0.06],
    'L3': [0.06,0.09],
    'L4': [0.09,0.12]
};

// N. B. These must be kept in sync with src/mmw/mmw/settings/base.py
var interactivity = {
        'boundary_county': 'name,id',
        'boundary_district': 'name,id',
        'boundary_school_district': 'name,id',
        'boundary_huc08': 'name,id',
        'boundary_huc10': 'name,id',
        'boundary_huc12': 'name,id'
    },
    tables = {
        county: 'boundary_county',
        district: 'boundary_district',
        school: 'boundary_school_district',
        huc8: 'boundary_huc08',
        huc10: 'boundary_huc10',
        huc12: 'boundary_huc12',
        drb_streams_v2: 'drb_streams_50',
        nhd_streams_v2: 'nhdflowline',
        nhd_quality_tn: 'nhd_quality_tn',
        nhd_quality_tp: 'nhd_quality_tp',
        nhd_quality_tss: 'nhd_quality_tss',
        municipalities: 'dep_municipalities',
        urban_areas: 'dep_urban_areas',
        // The DRB Catchment tables here use aliases to match data from different
        // columns in the `drb_catchment_water_quality` table to different
        // rendering rules.
        drb_catchment_water_quality_tn: 'drb_catchment_water_quality_tn',
        drb_catchment_water_quality_tp: 'drb_catchment_water_quality_tp',
        drb_catchment_water_quality_tss: 'drb_catchment_water_quality_tss'
    },
    drbCatchmentWaterQualityTable = 'drb_catchment_water_quality';
    nhdQualityTable = 'nhd_water_quality',
    shouldCacheRequest = function(req) {
        // Caching can happen if the bucket to write to is defined
        // and the request is not coming from localhost.
        return req.headers.host!== 'localhost' && tileCacheBucket;
    },
    getSqlForStreamByReq = function(req) {
        /* Limit the number of stream features returned at certain zoom levels.
         * Stream rendering is a function of stream_order in styles.mss.  Lower
         * number zoom levels only render higher order stream_orders.  Changing
         * these filters may impact the style definitions. Reducing the number
         * of features returned by the query greatly increase overall request
         * performance.
        */
        zoom = req.params.z;
        tableName = req.params.table;
        tableId = req.params.tableId;
        stream_order = 0;  // All streams

        if (tableName === tables.drb_streams_v2) {
            // drb_zoom_levels: { zoomLevel : stream_order }
            drb_zoom_levels = {
                1:7, 2:7, 3:7, 4:7, 5:7, 6:6, 7:6, 8:5, 9:5, 10:4,
                11:3, 12:2, 13:0, 14:0, 15:0, 16:0, 17:0, 18: 0
            };

            stream_order = zoom in drb_zoom_levels ? drb_zoom_levels[zoom] : 0;
        } else {
            if (zoom <= 5) {
                stream_order = 7;
            } else if (zoom <= 6) {
                stream_order = 6;
            } else if (zoom <= 8) {
                stream_order = 5;
            }
        }
        
        var caseSql = function(mapping, field) {
            var sql = []
            for (var category in mapping) {
                sql.push(['WHEN ',field,' >= ',mapping[category][0],' AND ',field,' < ',mapping[category][1],' THEN \'',category,'\' '].join(''));
            }
            sql.unshift('CASE ');
            sql.push('WHEN ',field,' > ',mapping.L4[1],' THEN \'L5\' ');
            sql.push('ELSE \'NA\' ');
            sql.push('END');

            return sql;
        }

        var waterQualitySql = function(qualityMap, streamOrder) {
            var sql = [];
            sql.push('(SELECT geom, stream_order, ')
            sql.push(qualityMap.join(''), ' ')
            sql.push('AS nhd_qual_grp ')
            sql.push('FROM ',tables.nhd_streams_v2,' ')
            sql.push('LEFT OUTER JOIN ',nhdQualityTable,' ')
            sql.push('ON ',nhdQualityTable,'.comid','=',tables.nhd_streams_v2,'.comid',' ')
            sql.push('WHERE stream_order >= ',streamOrder)
            sql.push(') as q');
            return sql.join('');
        }

        if (tableId === 'nhd_quality_tn') {
            return waterQualitySql(caseSql(NHD_QUALITY_TN_MAP, 'tn_yr_avg_concmgl'), stream_order);
        } else if (tableId === 'nhd_quality_tp') {
            return waterQualitySql(caseSql(NHD_QUALITY_TP_MAP, 'tp_yr_avg_concmgl'), stream_order);
        } else if (tableId === 'nhd_quality_tss') {
            return waterQualitySql(caseSql(NHD_QUALITY_TSS_MAP, 'tss_concmgl'), stream_order);
        } else {
            return '(SELECT geom, stream_order FROM ' + tableName +
              ' WHERE stream_order >= ' + stream_order + ') as q';
        }     
    },

    getSqlForDRBCatchmentByTableId = function(tableId) {
        var columnToRetrive = null,
            resultsAliasName = null;
        switch (tableId) {
            case 'drb_catchment_water_quality_tn':
                columnToRetrive = 'tn_tot_kgy';
                resultsAliasName = 'drb_wq_tn';
                break;
            case 'drb_catchment_water_quality_tp':
                columnToRetrive = 'tp_tot_kgy';
                resultsAliasName = 'drb_wq_tp';
                break;
            case 'drb_catchment_water_quality_tss':
                columnToRetrive = 'tss_tot_kg';
                resultsAliasName = 'drb_wq_tss';
                break;
            default:
                throw new Error('Invalid drb_catchment_water_quality value');
                break;
        }
        return '(SELECT geom, ' + columnToRetrive + ' FROM ' +
            drbCatchmentWaterQualityTable + ') AS ' + resultsAliasName;
    };

var config = {
    useProfiler: true,
    base_url: '/:tableId',
    base_url_notable: '/:tableId',
    grainstore: {
        datasource: {
            dbname: dbName,
            user: dbUser,
            host: dbHost,
            port: dbPort,
            password: dbPass,
            geometry_field: 'geom',
            srid: 4326
        }
    },
    renderCache: {
        ttl: 60000, // seconds
    },
    mapnik: {
        metatile: 4,
        bufferSize:64,
    },
    redis: {
        host: redisHost,
        port: redisPort
    },
    log_format: '{ "timestamp": ":date[iso]", "@fields": { "remote_addr": ":remote-addr", "body_bytes_sent": ":res[content-length]", "request_time": ":response-time", "status": ":status", "request": ":method :url HTTP/:http-version", "request_method": ":method", "http_referrer": ":referrer", "http_user_agent": ":user-agent" } }',

    enable_cors: true,

    beforeTileRender: function(req, res, callback) {
        try {
            callback(null);
        } catch (ex) {
            rollbar.handleError(ex, req);
            callback(ex);
        }
    },

    afterTileRender: function(req, res, tile, headers, callback) {
        try {
            // Complete render pipline first, add cache header for
            // 30 days
            headers['Cache-Control'] = 'max-age=2592000';
            callback(null, tile, headers);

            // Check if the environment is set up to cache tiles
            if (!shouldCacheRequest(req)) { return; }

            var cleanUrl = req.url[0] === '/' ? req.url.substr(1) : req.url,
                s3Obj = new aws.S3({params: {Bucket: tileCacheBucket, Key: cleanUrl}}),
                body;

            if (Buffer.isBuffer(tile)) {
                body = new stream.PassThrough();
                body.end(tile);
            } else {
                body = JSON.stringify(tile);
            }

            if (body) {
                s3Obj.upload({Body: body}, function(err, data) {
                    if (err) {
                        throw (err);
                    }
                });
            }

            callback(null);
        } catch (ex) {
            rollbar.handleError(ex, req);
            callback(ex, null);
        }
    },

    req2params: function(req, callback) {
        try {
            var tableId = req.params.tableId,
                tableName = tables[tableId];

            req.params.table = tableName;

            // Streams have special performance optimized SQL queries
            if (tableId.indexOf('streams') >= 0) {
                req.params.sql = getSqlForStreamByReq(req);
            }

            if (tableId.indexOf('drb_catchment') >= 0) {
                req.params.sql = getSqlForDRBCatchmentByTableId(tableId);
            }

            if (tableId.indexOf('nhd_quality') >= 0) {
                req.params.table = tables[tableId];
                req.params.sql = getSqlForStreamByReq(req);
            }

            req.params.dbname = dbName;
            req.params.style = styles;
            req.params.interactivity = interactivity[tableName];
            callback(null, req);
        } catch (ex) {
            rollbar.handleError(ex, req);
            callback(ex, null);
        }
    }
};

// Initialize tile server on port 4000
var ws = new Windshaft.Server(config);
ws.get('/health-check', healthCheck(config));
ws.listen(4000);
ws.use(rollbar.errorHandler(rollbarAccessToken, {environment: stackType}));
console.log('Starting MMW Windshaft tiler on http://localhost:4000' + config.base_url + '/:z/:x/:y.*');
