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

var config = {
    base_url: '/tiles',
    base_url_notable: '/tiles',
    grainstore: {
        datasource: {
            user: dbUser,
            host: dbHost,
            port: dbPort,
            password: dbPass,
            geometry_field: 'polygon', // TODO Change name.
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
            // TODO make this dynamic.
            req.params.table = 'predefined_shapes_district';
            req.params.dbname = dbName;
            req.params.style = styles;
            // TODO make this dynamic.
            req.params.interactivity = 'state_short,id'; // TODO make this configurable for data set.
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
