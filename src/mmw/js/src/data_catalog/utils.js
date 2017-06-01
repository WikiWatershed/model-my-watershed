"use strict";

// Convert LatLngBounds to BBox format
function formatBounds(bounds) {
    return [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth()
    ].join(',');
}

module.exports = {
    formatBounds: formatBounds
};
