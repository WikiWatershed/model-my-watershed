"use strict";

var router = require('../../router').router,
    App = require('../../app');

var ErrorHandlers = {
    itsi: function() {
        router.navigate('');
        alert("We're sorry, but there was an error logging you in with your" +
            " ITSI credentials. Please log in using another method or" +
            " continue as a guest."
        );
        App.showLoginModal();
    },

    generic: function(type) {
        router.navigate('');
        alert("We're sorry, but an error occurred in the application.");
        console.log("[MMW] An unknown error occurred: " + type);
    }
};

module.exports = {
    ErrorHandlers: ErrorHandlers
};
