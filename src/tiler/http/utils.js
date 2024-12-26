var aws = require("aws-sdk");
var debug = require("debug")("windshaft:server");
var rollbar = require("./rollbar");
var stream = require("stream");

const sendError = function (res, err, statusCode, label, tolog) {
  var olabel = "[";
  if (label) {
    olabel += label + " ";
  }
  olabel += "ERROR]";
  if (!tolog) {
    tolog = err;
  }
  var log_msg = olabel + " -- " + statusCode + ": " + tolog;
  //if ( tolog.stack ) log_msg += '\n' + tolog.stack;
  debug(log_msg); // use console.log for statusCode != 500 ?
  // If a callback was requested, force status to 200
  if (res.req) {
    // NOTE: res.req can be undefined when we fake a call to
    //       ourself from POST to /layergroup
    if (res.req.query.callback) {
      statusCode = 200;
    }
  }
  res.status(statusCode).send(err);
};

const cacheTile = function (req, tile, bucket) {
  // Skip caching if environment not set up for it
  if (req.headers.host === "localhost") {
    console.log("skipping cacheTile because running on localhost");
  } else if (!bucket) {
    console.log("skipping cacheTile because bucket not provided");
  } else {
    try {
      var cleanUrl = req.url[0] === "/" ? req.url.substr(1) : req.url;
      console.debug(`caching ${cleanUrl} to ${bucket}`);
      var s3Obj = new aws.S3({
          params: { Bucket: bucket, Key: cleanUrl, ContentType: "image/png" },
        }),
        body;
      if (Buffer.isBuffer(tile)) {
        body = new stream.PassThrough();
        body.end(tile);
      } else {
        body = JSON.stringify(tile);
      }
      if (body) {
        s3Obj.upload({ Body: body }, function (err) {
          if (err) {
            throw err;
          }
        });
      }
    } catch (ex) {
      rollbar.handleError(ex, req);
    }
  }
};

module.exports = { sendError, cacheTile };
