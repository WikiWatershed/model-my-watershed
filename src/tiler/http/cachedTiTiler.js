const request = require('request');
var Step = require('step');
var _ = require('underscore');
var utils = require('./utils');

const colormap = "%7B%220%22%3A%20%22%23000000%22%2C%20%221%22%3A%20%22%23419bdf%22%2C%20%222%22%3A%20%22%23397d49%22%2C%20%223%22%3A%20%22%23000000%22%2C%20%224%22%3A%20%22%237a87c6%22%2C%20%225%22%3A%20%22%23e49635%22%2C%20%226%22%3A%20%22%23000000%22%2C%20%227%22%3A%20%22%23c4281b%22%2C%20%228%22%3A%20%22%23a59b8f%22%2C%20%229%22%3A%20%22%23a8ebff%22%2C%20%2210%22%3A%20%22%23616161%22%2C%20%2211%22%3A%20%22%23e3e2c3%22%7D";

const tilerUrlBase = `https://${process.env.MMW_TITILER_HOST}`;

// Turns an array of strings formatted like ["io-lolc__2023__fec54b55-5e7..."] into a
// layer:year:UUID mapping object.
const parseTiTilerLayerParam = (layerParams) => {
  if (!layerParams || !layerParams.length) {
    return {};
  }
  const layerList = layerParams.map(term => term.split("__"))
    .map(([layer, year, uuid]) => { return {"layer": layer, "year": year, "uuid": uuid}});
  return layerList.reduce((layerMap, term) => {
    if (term.layer in layerMap) {
      layerMap[term.layer][term.year] = term.uuid;
    } else {
      layerMap[term.layer] = {[term.year]: term.uuid};
    }
    return layerMap;
  }, {});
}

// Initialize the lookup mapping from the environment on load
const titilerLayerMap = parseTiTilerLayerParam(process.env.MMW_TITILER_LAYER_MAP.split(","));

function getMosaicId(layer, year) {
  try {
    return titilerLayerMap[layer][year];
  } catch {
    console.log(titilerLayerMap);
    throw new Error(`No TiTiler source for layer ${layer}, year ${year}`);
  }
}

module.exports = function createTiTilerHandler(bucket) {
  return function(req, res) {
    Step(
      function fetchTile() {
        const mosaicUUID = getMosaicId(req.params.layer, req.params.year);
        const tileUrl = `${tilerUrlBase}/mosaicjson/mosaics/${mosaicUUID}/tiles/${req.params.z}/${req.params.x}/${req.params.y}.png`;
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
