"use strict";

var _ = require('lodash'),
    iframePhone = require('iframe-phone'),
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

    this.phone.addListener('getLearnerUrl', _.bind(this.setLearnerUrl, this));
    this.phone.addListener('getInteractiveState', _.bind(this.setLearnerUrl, this));
    this.phone.initialize();
};

module.exports = {
    ItsiEmbed: ItsiEmbed
};
