"use strict";

require('./core/setup');

//
// Initialize application.
//

var Backbone = require('../shim/backbone'),
    App = require('./app'),
    router = require('./router').router,
    routes = require('./routes'),
    userViews = require('./user/views'),
    userModels = require('./user/models');

App.on('start', function() {
    $('body').on('click', '[data-url]', function(e) {
        e.preventDefault();
        router.navigate($(this).data('url'), { trigger: true });
    });
    Backbone.history.start({ pushState: true });

    // Show login modal only if landing on home page
    if (Backbone.history.getFragment() === "") {
        this.getUserOrShowLogin();
    } else {
        this.user.fetch();
    }
});

App.start();

//
// Expose application so we can interact with it via JS console.
//

window.MMW = App;
window.MMW.router = router;
