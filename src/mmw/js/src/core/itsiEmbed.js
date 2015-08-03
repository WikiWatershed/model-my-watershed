"use strict";

var _ = require('lodash'),
    iframePhone = require('iframe-phone'),
    App = require('../app.js'),
    EMBED_FLAG = 'itsi_embed',
    QUERY_SUFFIX = EMBED_FLAG + '=true';

var ItsiEmbed = function() {
    this.phone = new iframePhone.getIFrameEndpoint();

    this.url = window.location.href + '?' + QUERY_SUFFIX;

    this.interactiveState = { url: this.url };

    this.setLearnerUrl = function(url) {
        if (url) {
            this.url = url + (url.indexOf('?') > 0 ? '&' : '?') + QUERY_SUFFIX;
            this.interactiveState = { url: this.url };
        }

        this.phone.post('setLearnerUrl', this.url);
        this.phone.post('interactiveState', this.interactiveState);
    };

    this.loadInteractive = function(interactiveState) {
        if (interactiveState && interactiveState.url) {
            // Only redirect if different URL
            if (window.location.href !== interactiveState.url) {
                if (App.currProject &&
                    !App.currProject.isNew() &&
                    !App.currProject.get('area_of_interest')) {
                    // Delete automatically created new project
                    App.currProject
                        .destroy()
                        .always(function() {
                            // Redirect after deletion
                            window.location.href = interactiveState.url;
                        });
                } else {
                    // No current project, just redirect
                    window.location.href = interactiveState.url;
                }
            }
        }
    };

    this.phone.addListener('getLearnerUrl', _.bind(this.setLearnerUrl, this));
    this.phone.addListener('getInteractiveState', _.bind(this.setLearnerUrl, this));
    this.phone.addListener('loadInteractive', _.bind(this.loadInteractive, this));
    this.phone.initialize();
};

module.exports = {
    ItsiEmbed: ItsiEmbed
};
