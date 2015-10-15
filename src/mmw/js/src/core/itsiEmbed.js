"use strict";

var _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    iframePhone = require('iframe-phone'),
    router = require('../router.js').router,
    EMBED_FLAG = 'itsi_embed',
    QUERY_SUFFIX = EMBED_FLAG + '=true';

var ItsiEmbed = function(App) {
    this.phone = new iframePhone.getIFrameEndpoint();

    this.url = window.location.href + '?' + QUERY_SUFFIX;

    this.interactiveState = { route: '/' };

    this.extendedSupport = { reset: false };

    this.setLearnerUrl = function(route) {
        if (route) {
            this.url = window.location.origin + '/' + route + '?' + QUERY_SUFFIX;
            this.interactiveState = { route: route };
        }
        
        this.sendLearnerUrl();
    };

    this.sendLearnerUrl = function() {
        this.phone.post('setLearnerUrl', this.url);
        this.phone.post('interactiveState', this.interactiveState);
    };

    this.sendLearnerUrlOnlyFromProjectView = function() {
        var projectRegex = /project\/\d+/;

        if (projectRegex.test(this.url)) {
            this.sendLearnerUrl();
        }
    };

    this.loadInteractive = function(interactiveState) {
        // Only redirect if route specified and different
        if (interactiveState &&
            interactiveState.route &&
            interactiveState.route !== Backbone.history.getFragment()) {

            App.currentProject = null;
            router.navigate(interactiveState.route, { trigger: true });
        }
    };

    this.getExtendedSupport = function() {
        this.phone.post('extendedSupport', this.extendedSupport);
    };

    this.phone.addListener('getExtendedSupport', _.bind(this.getExtendedSupport, this));
    this.phone.addListener('getLearnerUrl', _.bind(this.sendLearnerUrlOnlyFromProjectView, this));
    this.phone.addListener('getInteractiveState', _.bind(this.sendLearnerUrlOnlyFromProjectView, this));
    this.phone.addListener('loadInteractive', _.bind(this.loadInteractive, this));
    this.phone.initialize();
};

module.exports = {
    ItsiEmbed: ItsiEmbed
};
