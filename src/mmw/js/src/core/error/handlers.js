"use strict";

var router = require('../../router').router,
    modalModels = require('../modals/models'),
    modalViews = require('../modals/views'),
    App = require('../../app');

var ErrorHandlers = {
    itsi: function() {
        router.navigate('');
        var alertView = new modalViews.AlertView({
            model: new modalModels.AlertModel({
                alertMessage: "We're sorry, but there was an error logging you in with your" +
                            " ITSI credentials. Please log in using another method or" +
                            " continue as a guest.",
                alertType: modalModels.AlertTypes.error
            })
        });

        alertView.render();
        App.showLoginModal();
    },

    generic: function(type) {
        router.navigate('');
        var alertView = new modalViews.AlertView({
            model: new modalModels.AlertModel({
                alertMessage: "We're sorry, but an error occurred in the application.", 
                alertType: modalModels.AlertTypes.error
            })
        });

        alertView.render();
        console.log("[MMW] An unknown error occurred: " + type);
    }
};

module.exports = {
    ErrorHandlers: ErrorHandlers
};
