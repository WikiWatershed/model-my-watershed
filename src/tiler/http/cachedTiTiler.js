const request = require('request');
var Step = require('step');
var _ = require('underscore');
var utils = require('./utils');

const colormap = "%7B%220%22%3A%20%22%23000000%22%2C%20%221%22%3A%20%22%23419bdf%22%2C%20%222%22%3A%20%22%23397d49%22%2C%20%223%22%3A%20%22%23000000%22%2C%20%224%22%3A%20%22%237a87c6%22%2C%20%225%22%3A%20%22%23e49635%22%2C%20%226%22%3A%20%22%23000000%22%2C%20%227%22%3A%20%22%23c4281b%22%2C%20%228%22%3A%20%22%23a59b8f%22%2C%20%229%22%3A%20%22%23a8ebff%22%2C%20%2210%22%3A%20%22%23616161%22%2C%20%2211%22%3A%20%22%23e3e2c3%22%7D";

// TODO: move these into the environment
const tilerUrlBase = "https://d281l4xlbzu2fv.cloudfront.net";

function yearToMosaicId(year) {
  return {
    "2017": "6900be40-a0d8-407f-a5d5-cc431310686c",
    "2018": "4a0dc777-6fcf-4a46-8e2e-fd0b97d712d8",
    "2019": "570f1af6-049d-45bb-a31e-0b1a88524283",
    "2020": "47e3dc4d-1849-4830-a1c2-3c9a3186644d",
    "2021": "8f8316e7-6100-4c8b-bd4d-91dcd104ff09",
    "2022": "d36543c2-6b4f-47a8-9b13-0341ce222a31",
    "2023": "fec54b55-5e75-4c6d-ac47-41579d722dab"
  }[year];
}

function yearToMosaicIdFromEnv(year) {
  return process.env[`LULC_MOSAIC_ID_${year}`];
}

module.exports = function createTiTilerHandler(bucket) {
  return function(req, res) {
    Step(
      function fetchTile() {
        const yearUUID = yearToMosaicId(req.params.year);
        if (!yearUUID) {
          throw new Error(`No TiTiler source for year ${year}`);
        }
        const tileUrl = `${tilerUrlBase}/mosaicjson/mosaics/${yearUUID}/tiles/${req.params.z}/${req.params.x}/${req.params.y}.png`;
        const queryString = `colormap=${colormap}`;
        request.get(`${tileUrl}?${queryString}`, {encoding: null}, this);
      },
      function sendResponse(error, response, tile) {
        if (error) {
          utils.sendError(res, { errors: [error.message] }, 400, 'TITILER', error);
        } else if (response.statusCode !== 200) {
          utils.sendError(res, { errors: [response.statusMessage] }, response.statusCode, 'TITILER');
        } else {
          // Add cache header for 30 days
          res.status(response.statusCode)
              .set(_.extend(response.headers, { 'Cache-Control': 'max-age=2592000' }))
              .send(tile);
          utils.cacheTile(req, tile, bucket);
        }
      }
    );
  };
};
