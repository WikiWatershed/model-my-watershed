"use strict";

var _ = require('lodash'),
    iframePhone = require('iframe-phone'),
    EMBED_FLAG = 'itsi_embed',
    QUERY_SUFFIX = EMBED_FLAG + '=true';

var ItsiEmbed = function() {
    this.phone = new iframePhone.getIFrameEndpoint();

    this.url = window.location.href + '?' + QUERY_SUFFIX;

    this.setLearnerUrl = function(url) {
        if (url) {
            this.url = url + (url.indexOf('?') > 0 ? '&' : '?') + QUERY_SUFFIX;
        }

        this.phone.post('setLearnerUrl', this.url);
    };

    this.phone.addListener('getLearnerUrl', _.bind(this.setLearnerUrl, this));
    this.phone.initialize();
};

module.exports = {
    ItsiEmbed: ItsiEmbed
};
