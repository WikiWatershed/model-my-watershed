"use strict";

var router = require('../../router').router,
    modalModels = require('../modals/models'),
    modalViews = require('../modals/views'),
    App = require('../../app');

var ErrorHandlers = {
    itsi: function() {
        router.navigate('', { trigger: true });
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

    hydroshareNotFound: function() {
        router.navigate('', { trigger: true });
        var alertView = new modalViews.AlertView({
            model: new modalModels.AlertModel({
                alertMessage:
                    "We're sorry, but we couldn't find a project corresponding " +
                    "to that HydroShare Resource. If accessing a public resource, " +
                    "please make sure it has an <code>mmw_project_snapshot.json</code> file. " +
                    "If accessing a private resource, please make sure you link your " +
                    "WikiWatershed account to HydroShare in your Account Settings.",
                alertType: modalModels.AlertTypes.error
            })
        });

        alertView.render();
    },

    hydroshareNotLoggedIn: function() {
        router.navigate('', { trigger: true });
        var alertView = new modalViews.AlertView({
            model: new modalModels.AlertModel({
                alertMessage:
                    "Only logged in users are allowed to edit projects. Please " +
                    "log in to or create an account, and then try to edit the " +
                    "HydroShare resource again.",
                alertType: modalModels.AlertTypes.error
            })
        });

        alertView.on('dismiss', function() {
            App.showLoginModal();
        });

        alertView.render();
    },

    generic: function(type) {
        router.navigate('', { trigger: true });
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
