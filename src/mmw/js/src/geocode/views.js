"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    router = require('../router').router,
    drawViews = require('../draw/views'),
    modalModels = require('../core/modals/models'),
    models = require('./models'),
    geocoderTmpl = require('./templates/geocoder.html'),
    searchTmpl = require('./templates/search.html'),
    suggestionsTmpl = require('./templates/suggestions.html');

var ENTER_KEYCODE = 13,
    ESC_KEYCODE = 27;

var ICON_BASE = 'search-icon fa ',
    ICON_DEFAULT = 'fa-search',
    ICON_WORKING = 'fa-circle-o-notch fa-spin',
    ICON_EMPTY   = 'fa-exclamation-triangle empty',
    ICON_ERROR   = 'fa-exclamation-triangle error';

var MSG_DEFAULT = '',
    MSG_EMPTY   = 'No results found.',
    MSG_ERROR   = 'Oops! Something went wrong.';


function addBoundaryLayer(model) {
    var layerCode = model.get('code'),
        shapeId = model.get('id'),
        shapeName = model.get('text'),
        layerName = model.get('label');

    App.restApi.getPolygon({
            layerCode: layerCode,
            shapeId: shapeId
        })
        .then(function(shape) {
            var wkaoi = layerCode + '__' + shapeId;
            drawViews.addLayer(shape, shapeName, layerName, wkaoi);
        });
}

function selectSearchSuggestion(model) {
    model.setMapViewToLocation();
    if (model.get('isBoundaryLayer')) {
        addBoundaryLayer(model);
        router.navigate('draw/', { trigger: true });
    } else {
        drawViews.clearAoiLayer();
    }
}

var GeocoderView = Marionette.LayoutView.extend({
    template: geocoderTmpl,

    regions: {
        searchBoxRegion: '#geocoder-search-box-region'
    },

    onShow: function() {
        this.searchBoxRegion.show(
            new SearchBoxView({
                model: new models.GeocoderModel(),
                collection: new models.SuggestionsCollection()
            })
        );
    }
});

var SearchBoxView = Marionette.LayoutView.extend({
    template: searchTmpl,

    ui: {
        'searchBox': '#geocoder-search',
        'searchIcon': '.search-icon',
        'message': '.message',
        'messageDismiss': '.dismiss',
        'resultsRegion': '#geocode-search-results-region',
        'selectButton': '.search-select-btn'
    },

    events: {
        'keyup @ui.searchBox': 'processSearchInputEvent',
        'click @ui.messageDismiss': 'dismissAction',
        'click @ui.selectButton': 'validateShapeAndGoToAnalyze'
    },

    modelEvents: {
        'change:query change:selectedSuggestion': 'render'
    },

    regions: {
        'resultsRegion': '#geocode-search-results-region'
    },

    setIcon: function(icon) {
        this.ui.searchIcon.prop('class', ICON_BASE + icon);
    },

    setMessage: function(message) {
        this.ui.message.find('span').html(message);
        if (message && message !== '') {
            this.ui.message.removeClass('hidden');
        } else {
            this.ui.message.addClass('hidden');
        }
    },

    setStateDefault: function() {
        this.setIcon(ICON_DEFAULT);
        this.setMessage(MSG_DEFAULT);
    },

    setStateWorking: function() {
        this.setIcon(ICON_WORKING);
    },

    setStateEmpty: function() {
        this.emptyResultsRegion();
        this.setIcon(ICON_EMPTY);
        this.setMessage(MSG_EMPTY);
    },

    setStateError: function() {
        this.emptyResultsRegion();
        this.setIcon(ICON_ERROR);
        this.setMessage(MSG_ERROR);
    },

    processSearchInputEvent: function(e) {
        var query = this.ui.searchBox.val().trim();

        if (e.keyCode === ESC_KEYCODE) {
            this.dismissAction();
            return false;
        }

        if (query === '') {
            this.setStateDefault();
            this.emptyResultsRegion();
            return false;
        }

        if (e.keyCode === ENTER_KEYCODE) {
            if (this.collection.length >= 1) {
                this.selectFirst();
            }
        } else if (query !== this.model.get('query')) {
            this.model.set('query', query, { silent: true });
            this.setStateWorking();
            this.makeThrottledSearch(query);
        }
    },

    makeThrottledSearch: _.throttle(function(query) {
        this.handleSearch(query);
    }, 500, { leading: false, trailing: true }),

    handleSearch: function(query) {
        var self = this;
        var defer = $.Deferred();

        function fail(args) {
            if (args && args.cancelled) {
                return;
            }
            self.setStateError();
        }

        // Cancel in-progress search request
        if (this.searchRequest) {
            this.searchRequest.cancel();
        }

        // Make sure there's a place to put search results as they stream in
        this.showResultsRegion();

        this.searchRequest = this.search(query);
        this.searchRequest
            .done(_.bind(this.setStateDefault, this))
            .fail(fail);

        return defer.promise();
    },

    search: function(query) {
        return this.collection.fetch({
            data: { text: query }
        });
    },

    selectFirst: function() {
        var self = this,
            defer = $.Deferred();

        if (this.collection.size() === 0) {
            this.setStateError();
            defer.reject();
            return defer.promise();
        }

        this.setStateWorking();

        this.collection
            .first()
            .select()
                .done(function() {
                    var model = self.collection.first();
                    self.selectSuggestion(model);
                })
                .fail(_.bind(this.setStateError, this))
                .always(_.bind(this.reset, this));

        return defer.promise();
    },

    showResultsRegion: function() {
        var view = new SuggestionsView({
            collection: this.collection
        });

        this.listenTo(view, 'suggestion:select:in-progress', function() {
            this.setStateWorking();
        });
        this.listenTo(view, 'suggestion:select:success', function(suggestionModel) {
            this.selectSuggestion(suggestionModel);
        });
        this.listenTo(view, 'suggestion:select:failure', function() {
            this.setStateError();
        });

        this.getRegion('resultsRegion').show(view);
    },

    emptyResultsRegion: function() {
        this.getRegion('resultsRegion').empty();
    },

    selectSuggestion: function(suggestionModel) {
        this.dismissAction();
        this.model.set('selectedSuggestion', suggestionModel);
        selectSearchSuggestion(suggestionModel);
    },

    reset: function() {
        this.ui.searchBox.val('');
        this.model.set({
            query: '',
            selectedSuggestion: null,
        });
        this.emptyResultsRegion();
        drawViews.clearAoiLayer();
    },

    dismissAction: function() {
        this.reset();
        this.setStateDefault();
    },

    validateShapeAndGoToAnalyze: function() {
        drawViews.validateShape(App.map.get('areaOfInterest'))
            .fail(function(message) {
                drawViews.displayAlert(message, modalModels.AlertTypes.error);
            })
            .done(function() {
                router.navigate('/analyze', { trigger: true });
            });
    }
});

var SuggestionsView = Backbone.View.extend({
    initialize: function() {
        this.$el.on('click', 'li', _.bind(this.selectSuggestion, this));
        this.listenTo(this.collection, 'add remove change reset', this.render);
    },

    selectSuggestion: function(e) {
        var $el = $(e.target),
            cid = $el.attr('data-cid'),
            model = this.collection.get(cid);

        this.trigger('suggestion:select:in-progress');

        model.select()
            .done(_.bind(this.selectSuccess, this, model))
            .fail(_.bind(this.selectFail, this));
    },

    selectSuccess: function(model) {
        this.trigger('suggestion:select:success', model);
    },

    selectFail: function() {
        this.trigger('suggestion:select:failure');
    },

    render: function() {
        var html = suggestionsTmpl.render({
            geocodeSuggestions: this.collection.geocodeSuggestions,
            boundarySuggestions: this.collection.boundarySuggestions
                .groupBy('label')
        });
        this.$el.html(html);
    }
});

module.exports = {
    GeocoderView: GeocoderView,
    SuggestionsView: SuggestionsView,
    SearchBoxView: SearchBoxView
};
