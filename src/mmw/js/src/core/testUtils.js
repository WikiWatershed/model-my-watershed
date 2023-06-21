"use strict";

var $ = require('jquery');

// Mock the Google Analytics function for tests
window.dataLayer = { push: function() {} };

// Should be called after each unit test.
function resetApp(app) {
    app.map.off();
    app.map = null;

    app._mapView.destroy();
    // Re-create the map div because it gets destroyed by destroy()
    $('body').append($('<div id="map"/>').css({
        display: 'none',
        position: 'relative'
    }));

    // Don't destroy the rootView because it is attached to the
    // body element.
    //app.rootView.destroy();

    app.user.off();
    app.user = null;

    app.header.destroy();

    if (app.currentProject) {
        app.currentProject.off();
        app.currentProject = null;
    }

    if (app.itsi) {
        app.itsi = null;
    }

    app.initialize();
}

module.exports = {
    resetApp: resetApp
};
