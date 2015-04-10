"use strict";

var $ = require('jquery'),
    Marionette = require('../shim/backbone.marionette'),
    views = require('./core/views'),
    models = require('./core/models');

var App = new Marionette.Application({
    initialize: function() {
        this.restApi = new RestAPI();
        this.map = new models.MapModel();

        // This view is intentionally not attached to any region.
        this.mapView = new views.MapView({
            model: this.map
        });

        this.rootView = new views.RootView();
    },

    load: function(data) {
        var mapState = data.map;
        if (mapState) {
            this.map.set({
                lat: mapState.lat,
                lng: mapState.lng,
                zoom: mapState.zoom
            });
        }
    },

    getLeafletMap: function() {
        return this.mapView._leafletMap;
    }
});

// TODO: Query Django Rest Framework API
function RestAPI() {
    return {
        getPredefinedShapes: function() {
            var defer = $.Deferred();
            setTimeout(function() {
                defer.resolve({
                    shapes: [
                        { id: 0, name: 'Huc 0' },
                        { id: 1, name: 'Huc 1' },
                        { id: 2, name: 'Huc 2' }
                    ]
                });
            }, 1000);
            return defer.promise();
        },

        getPolygon: function(args) {
            var defer = $.Deferred();
            setTimeout(function() {
                var shape;
                if (args.id) {
                    shape = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.14167785644531,40.01920130768676],[-75.06065368652344,39.998163944585805],[-75.11764526367188,39.970279452701824],[-75.14236450195312,39.942910023503146],[-75.13069152832031,39.90288884886166],[-75.17051696777344,39.8870845777293],[-75.19454956054688,39.885503950179555],[-75.21514892578124,39.91710957679779],[-75.179443359375,39.95922773254976],[-75.201416015625,39.98869501604662],[-75.17326354980469,40.01078714046552],[-75.14167785644531,40.01920130768676]]]}};
                } else {
                    shape = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.23059844970702,40.02945467133602],[-75.19248962402344,40.00631669218863],[-75.20313262939453,39.983960059494684],[-75.18218994140625,39.964227541526895],[-75.17601013183592,39.95764876954889],[-75.19248962402344,39.940277770390324],[-75.2017593383789,39.94238358098156],[-75.21034240722656,39.92211246412495],[-75.29926300048828,39.90631262724705],[-75.37616729736328,39.91263299937426],[-75.3943634033203,39.95106936461956],[-75.40088653564453,39.96554321996606],[-75.41084289550781,39.96554321996606],[-75.4159927368164,40.00999825910233],[-75.3607177734375,40.033134990098155],[-75.31539916992188,40.018675452628074],[-75.27557373046875,40.00263492672169],[-75.25978088378906,40.00447583427404],[-75.23059844970702,40.02945467133602]]]}};
                }
                defer.resolve(shape);
            });
            return defer.promise();
        }
    };
}

module.exports = App;
