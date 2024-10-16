var WindshaftServer = require('./http/windshaftServer'),
    rollbar = require('./http/rollbar'),
    healthCheck = require('./healthCheck'),
    cachedTiTiler = require('./http/cachedTiTiler'),
    fs = require('fs'),
    getStyle = name =>
        fs.readFileSync('styles/_variables.mss', { encoding: 'utf8' }) +
        fs.readFileSync(`styles/${name}.mss`, { encoding: 'utf8' }),
    styles = {
        boundary: getStyle('boundary'),
        dep_municipalities: getStyle('dep_municipalities'),
        dep_urban_areas: getStyle('dep_urban_areas'),
        drb_catchment_water_quality_tn: getStyle('drb_catchment_water_quality_tn'),
        drb_catchment_water_quality_tp: getStyle('drb_catchment_water_quality_tp'),
        drb_catchment_water_quality_tss: getStyle('drb_catchment_water_quality_tss'),
        quality: getStyle('quality'),
        streams: getStyle('streams'),
    };

var dbUser = process.env.MMW_DB_USER,
    dbPass = process.env.MMW_DB_PASSWORD,
    dbHost = process.env.MMW_DB_HOST,
    dbName = process.env.MMW_DB_NAME,
    dbPort = process.env.MMW_DB_PORT,
    redisHost = process.env.MMW_CACHE_HOST,
    redisPort = process.env.MMW_CACHE_PORT,
    tileCacheBucket = process.env.MMW_TILECACHE_BUCKET,
    stackType = process.env.MMW_STACK_TYPE;

// Updates to steps should also be made to the legend_mappings in mmw/settings/layer_settings
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
        county: {
            name: 'boundary_county',
            style: styles.boundary,
        },
        district: {
            name: 'boundary_district',
            style: styles.boundary,
        },
        school: {
            name: 'boundary_school_district',
            style: styles.boundary,
        },
        huc8: {
            name: 'boundary_huc08',
            style: styles.boundary,
        },
        huc10: {
            name: 'boundary_huc10',
            style: styles.boundary,
        },
        huc12: {
            name: 'boundary_huc12',
            style: styles.boundary,
        },
        drb_streams_v2: {
            name: 'drb_streams_50',
            style: styles.streams,
        },
        nhd_streams_v2: {
            name: 'nhdflowline',
            style: styles.streams,
        },
        nhd_streams_hr_v1: {
            name: 'nhdflowlinehr',
            style: styles.streams,
        },
        tdxhydro_streams_v1: {
            name: 'tdxhydro',
            style: styles.streams,
        },
        nhd_quality_tn: {
            name: 'nhd_quality_tn',
            style: styles.quality,
        },
        nhd_quality_tp: {
            name: 'nhd_quality_tp',
            style: styles.quality,
        },
        nhd_quality_tss: {
            name: 'nhd_quality_tss',
            style: styles.quality,
        },
        municipalities: {
            name: 'dep_municipalities',
            style: styles.dep_municipalities,
        },
        urban_areas: {
            name: 'dep_urban_areas',
            style: styles.dep_urban_areas,
        },
        // The DRB Catchment tables here use aliases to match data from different
        // columns in the `drb_catchment_water_quality` table to different
        // rendering rules.
        drb_catchment_water_quality_tn: {
            name: 'drb_catchment_water_quality_tn',
            style: styles.drb_catchment_water_quality_tn,
            column: 'tn_tot_kgy',
        },
        drb_catchment_water_quality_tp: {
            name: 'drb_catchment_water_quality_tp',
            style: styles.drb_catchment_water_quality_tp,
            column: 'tp_tot_kgy',
        },
        drb_catchment_water_quality_tss: {
            name: 'drb_catchment_water_quality_tss',
            style: styles.drb_catchment_water_quality_tss,
            column: 'tss_tot_kg',
        },
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
        minStreamsByLevel = {
            [tables.drb_streams_v2.name]: {
                // Zoom Level: Lowest Stream Order to Render
                1: 7,
                2: 7,
                3: 7,
                4: 7,
                5: 7,
                6: 6,
                7: 6,
                8: 5,
                9: 5,
                10: 4,
                11: 3,
                12: 2,
                13: 0,
            },
            [tables.tdxhydro_streams_v1.name]: {
                1: 6,
                2: 6,
                3: 6,
                4: 6,
                5: 5,
                6: 5,
                7: 4,
                8: 4,
                9: 3,
                10: 3,
                11: 2,
                12: 1,
                13: 1,
            },
            default: {
                1: 7,
                2: 7,
                3: 7,
                4: 7,
                5: 7,
                6: 6,
                7: 5,
                8: 5,
                9: 4,
                10: 0, 
            }
        };
        minStreamsForTable = tableName in minStreamsByLevel ? minStreamsByLevel[tableName] : minStreamsByLevel.default;
        stream_order = minStreamsForTable[zoom] || 0;

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
            sql.push('SELECT geom, stream_order, ')
            sql.push(qualityMap.join(''), ' ')
            sql.push('AS nhd_qual_grp ')
            sql.push('FROM ',tables.nhd_streams_v2.name,' ')
            sql.push('LEFT OUTER JOIN ',nhdQualityTable,' ')
            sql.push('ON ',nhdQualityTable,'.comid','=',tables.nhd_streams_v2.name,'.comid',' ')
            sql.push('WHERE stream_order >= ',streamOrder)
            return sql.join('');
        }

        if (tableId === 'nhd_quality_tn') {
            return waterQualitySql(caseSql(NHD_QUALITY_TN_MAP, 'tn_yr_avg_concmgl'), stream_order);
        } else if (tableId === 'nhd_quality_tp') {
            return waterQualitySql(caseSql(NHD_QUALITY_TP_MAP, 'tp_yr_avg_concmgl'), stream_order);
        } else if (tableId === 'nhd_quality_tss') {
            return waterQualitySql(caseSql(NHD_QUALITY_TSS_MAP, 'tss_concmgl'), stream_order);
        } else {
            return 'SELECT geom, stream_order FROM ' + tableName +
              ' WHERE stream_order >= ' + stream_order;
        }
    },

    getSqlForDRBCatchmentByTableId = function(tableId) {
        var { column } = tables[tableId];

        return `SELECT geom, ${column} FROM ${drbCatchmentWaterQualityTable}`;
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
        bufferSize: 64,
    },
    redis: {
        host: redisHost,
        port: redisPort
    },

    enable_cors: true,

    // Custom config used for caching tiles to S3
    s3Cache: {
        bucket: tileCacheBucket,
    },

    req2params: function(req, callback) {
        try {
            var tableId = req.params.tableId,
                { name, style } = tables[tableId];

            req.params.table = name;

            // Streams have special performance optimized SQL queries
            if (tableId.indexOf('streams') >= 0) {
                req.params.sql = getSqlForStreamByReq(req);
            }

            if (tableId.indexOf('drb_catchment') >= 0) {
                req.params.sql = getSqlForDRBCatchmentByTableId(tableId);
            }

            if (tableId.indexOf('nhd_quality') >= 0) {
                req.params.sql = getSqlForStreamByReq(req);
            }

            if (name.indexOf('boundary') >= 0) {
                req.params.sql = `SELECT id, geom, name FROM ${name}`;
            }

            if (!req.params.sql) {
                req.params.sql = `SELECT geom FROM ${name}`;
            }

            req.params.dbname = dbName;
            req.params.style = style;
            req.params.interactivity = interactivity[name];

            callback(null, req);
        } catch (ex) {
            rollbar.handleError(ex, req);
            callback(ex, null);
        }
    }
};

// Initialize tile server on port 4000
var ws = new WindshaftServer(config);
ws.get('/health-check', healthCheck(config));
ws.get('/titiler/:layer/:year/:z/:x/:y.png', cachedTiTiler(config.s3Cache.bucket));
ws.listen(4000);
ws.use(rollbar.errorHandler({ environment: stackType }));
console.log('Starting MMW Windshaft tiler on http://localhost:4000' + config.base_url + '/:z/:x/:y.*');
