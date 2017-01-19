'use strict';

var L = require('leaflet');

var PRECISION = 5;

module.exports = L.Control.extend({
    options: {
        position: 'bottomleft'
    },

    onAdd: function(map) {
        var el = L.DomUtil.create('span');
        el.className = 'leaflet-latlng-control';

        L.DomEvent.disableClickPropagation(el);

        map.on('mousemove', this.update, this);
        map.on('click', this.log, this);

        this.el = el;
        return el;
    },

    onRemove: function(map) {
        map.off('mousemove', this.update, this);
        map.off('click', this.log, this);
    },

    log: function(e) {
        if (console && console.debug) {
            console.debug(e.latlng.toString(PRECISION));
        }
    },

    update: function(e) {
        this.latlng = e.latlng;
        this.render();
    },

    getLatLngString: function() {
        var lat = L.Util.formatNum(this.latlng.lat, PRECISION),
            lng = L.Util.formatNum(this.latlng.lng, PRECISION);
        return 'Lat: ' + lat + ' Lng: ' + lng;
    },

    render: function() {
        this.el.innerText = this.getLatLngString();
    }
});
