var Windshaft = require('windshaft'),
    fs = require('fs'),
    styles = fs.readFileSync('styles.mss', { encoding: 'utf8' });

var dbUser = process.env.MMW_DB_USER,
    dbPass = process.env.MMW_DB_PASSWORD,
    dbHost = process.env.MMW_DB_HOST,
    dbName = process.env.MMW_DB_NAME,
    dbPort = process.env.MMW_DB_PORT,
    redisHost = process.env.MMW_CACHE_HOST,
    redisPort = process.env.MMW_CACHE_PORT;

// N. B. These must be kept in sync with src/mmw/mmw/settings/base.py
// and there must be a style in styles.mss for every table.  The table
// keys (e.g. 0 for 'modeling_district') should be given
// sequentially).
var interactivity = {'modeling_district': 'state_short,id'},
    tables = {0: 'modeling_district'};

var config = {
    base_url: '/:tableId',
    base_url_notable: '/:tableId',
    grainstore: {
        datasource: {
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

    beforeTileRender: function(req, res, callback) {
        callback(null);
    },

    afterTileRender: function(req, res, tile, headers, callback) {
        callback(null, tile, headers);
    },

    req2params: function(req, callback) {
        try {
            var tableId = req.params.tableId,
                tableName = tables[tableId];

            req.params.table = tableName;
            req.params.dbname = dbName;
            req.params.style = styles;
            req.params.interactivity = interactivity[tableName];
            callback(null, req);
        } catch(err) {
            callback(err, null);
        }
    }
};

// Initialize tile server on port 4000
var ws = new Windshaft.Server(config);
ws.listen(4000);
console.log('Starting MMW Windshaft tiler on http://localhost:4000' + config.base_url + '/:z/:x/:y.*');
