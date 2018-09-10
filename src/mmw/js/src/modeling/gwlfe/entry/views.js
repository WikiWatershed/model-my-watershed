"use strict";

var modalViews = require('../../../core/modals/views'),
    modalTmpl = require('./templates/modal.html');

var EntryModal = modalViews.ModalBaseView.extend({
    template: modalTmpl,

    id: 'entry-modal',
    className: 'modal modal-large fade',

    regions: {
        panelsRegion: '.tab-panels-region',
    },
});

module.exports = {
    EntryModal: EntryModal,
};
