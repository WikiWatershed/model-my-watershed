var Step = require('step');
var Pg = require('pg');
var Redis = require('redis');

/**
 * Attempts to connect to a PostgreSQL database, providing the
 * callback with the error object.
 *
 * The error object is the second callback argument because
 * error objects in the first argument cause Step to short
 * circuit. In the case of a health check, we want all
 * errors.
 *
 * @param {string} host
 * @param {string} port
 * @param {string} user
 * @param {string} password
 * @param {string} database
 * @param {function} callback
 */
function checkPostgres(host, port, user, password, database, callback) {
  var conString = ['postgres://', user, ':', password, '@', host, '/', database].join('');
  var client = new Pg.Client(conString);

  client.connect(function(err) {
    client.end();
    callback(null, err);
  });
}

/**
 * Attempts to connect to a Redis data store, providing the
 * callback with the error object.
 *
 * The error object is the second callback argument because
 * error objects in the first argument cause Step to short
 * circuit. In the case of a health check, we want all
 * errors.
 *
 * @param {string} host
 * @param {string} port
 * @param {function} callback
 */
function checkRedis(host, port, callback) {
  var client = Redis.createClient(port, host);

  client.on('connect', function(err) {
    client.quit();
    callback(null, err);
  });

  client.on('error', function(err) {
    client.quit();
    callback(null, err);
  });
}

function buildPayload(err) {
  var payload = {};

  if (err) {
    payload = {'ok': !err, 'msg': err.toString()};
  } else {
    payload = {'ok': !err};
  }

  return payload;
}

/**
 * Makes use of the PostgreSQL and Redis checks above to return
 * a JSON object representing the health of both data stores:
 *
 * {
 *   "databases": [
 *     {
 *       "default": {
 *         "ok": true
 *       }
 *    }
 *   ],
 *   "caches": [
 *     {
 *       "default": {
 *         "ok": true
 *       }
 *     }
 *   ]
 * }
 *
 * @param {object} config - The configuration object passed to Windshaft.Server()
 */
module.exports = function createHealthCheckHandler(config) {
  var pgConf = config.grainstore.datasource,

    pgHost = pgConf.host,
    pgPort = pgConf.port,
    pgUser = pgConf.user,
    pgPassword = pgConf.password,
    pgDatabase = pgConf.dbname,

    redisHost = config.redis.host,
    redisPort = config.redis.port;

  return function(req, res) {
    var status = {};

    Step(
      function executeChecks() {
        checkPostgres(pgHost, pgPort, pgUser, pgPassword, pgDatabase, this.parallel());
        checkRedis(redisHost, redisPort, this.parallel());
      },
      function sendResponse(err, databaseError, cacheError) {
        var response = {},
            statusCode = 503;

        response.databases = [{'default': buildPayload(databaseError)}];
        response.caches = [{'default': buildPayload(cacheError)}];

        if (!databaseError && !cacheError) {
          statusCode = 200;
        } else {
          console.error(response);
        }

        res.status(statusCode).send(response);
    });
  };
};
