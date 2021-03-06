"use strict";

var _ = require('underscore'),
    $ = require('jquery'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    App = require('../app'),
    router = require('../router').router,
    utils = require('../core/utils'),
    drawViews = require('../draw/views'),
    modalModels = require('../core/modals/models'),
    models = require('./models'),
    geocoderTmpl = require('./templates/geocoder.html'),
    searchTmpl = require('./templates/search.html'),
    locationTmpl = require('./templates/location.html'),
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


function addBoundaryLayer(suggestionModel, shape) {
    var layerCode = suggestionModel.get('code'),
        shapeId = suggestionModel.get('id'),
        shapeName = suggestionModel.get('text'),
        layerName = suggestionModel.get('label'),
        wkaoi = layerCode + '__' + shapeId;

   drawViews.addLayer(shape, shapeName, layerName, wkaoi);
}

function addGeocoderBoundaryLayer(suggestionModel) {
    App.restApi.getPolygon({
            layerCode: suggestionModel.get('code'),
            shapeId: suggestionModel.get('id')
        })
        .then(function(shape) {
            App.map.set('selectedGeocoderArea', shape);
        });
}

function selectSearchSuggestion(model) {
    model.setMapViewToLocation();
    if (model.get('isBoundaryLayer')) {
        addGeocoderBoundaryLayer(model);
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
        'popover': '[data-toggle="popover"]',
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

    initialize: function() {
        this.listenTo(App.map, 'change:selectedGeocoderArea', this.resetIfSelectedAreaIsCleared);
    },

    modelEvents: {
        'change:query change:selectedSuggestion': 'onShow'
    },

    regions: {
        'resultsRegion': '#geocode-search-results-region'
    },

    onShow: function() {
        var query = this.model.get('query'),
            selectedSuggestion = this.model.get('selectedSuggestion');

        if (selectedSuggestion && selectedSuggestion.get('isBoundaryLayer')) {
            this.ui.selectButton.removeClass('hidden');
        } else {
            this.ui.selectButton.addClass('hidden');
        }

        if (selectedSuggestion && selectedSuggestion.get('text')) {
            this.ui.searchBox.val(selectedSuggestion.get('text'));
        } else {
            this.ui.searchBox.val(query);
        }

        this.ui.popover.popover();
    },

    onDestroy: function() {
        App.map.set('selectedGeocoderArea', null);
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
            } else if (this.model.get('location') !== null) {
                this.model.get('location').select();
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

        var coords = utils.parseLocation(query);

        if (coords) {
            this.showLocationRegion(coords);
            this.setStateDefault();
            return;
        }

        // Make sure there's a place to put search results as they stream in
        this.showResultsRegion();

        this.searchRequest = this.search(query);
        this.searchRequest
            .done(_.bind(this.setStateDefault, this))
            .fail(fail);

        return this.searchRequest;
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

        return this.collection
            .first()
            .select()
                .done(function() {
                    var model = self.collection.first();
                    self.selectSuggestion(model);
                })
                .fail(_.bind(this.setStateError, this))
                .always(_.bind(this.reset, this));
    },

    showLocationRegion: function(coords) {
        var model = new models.LocationModel(coords),
            view = new LocationView({ model: model });

        this.model.set('location', model);

        model.on('change:selected', this.dismissAction, this);

        this.getRegion('resultsRegion').show(view);
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
            location: null,
        });
        this.emptyResultsRegion();
        App.map.set('selectedGeocoderArea', null);
    },

    resetIfSelectedAreaIsCleared: function(model, selectedGeocoderArea) {
        if (!selectedGeocoderArea) {
            this.reset();
        }
    },

    dismissAction: function() {
        this.reset();
        this.setStateDefault();
    },

    validateShapeAndGoToAnalyze: function() {
        var selectedBoundary = this.model.get('selectedSuggestion'),
            selectedBoundaryShape = App.map.get('selectedGeocoderArea');

        if (!selectedBoundary.get('isBoundaryLayer') ||
            !selectedBoundaryShape) {
            // Fail early if there's no selected geocoder result on the map
            // or the selected suggestion isn't a boundary layer
            return false;
        }

        drawViews.validateShape(selectedBoundaryShape)
            .fail(function(message) {
                drawViews.displayAlert(message, modalModels.AlertTypes.error);
            })
            .done(function() {
                App.map.set('selectedGeocoderArea', null);
                App.clearAnalyzeCollection();
                App.clearDataCatalog();
                addBoundaryLayer(selectedBoundary, selectedBoundaryShape);
                router.navigate('/analyze', { trigger: true});
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

var LocationView = Marionette.ItemView.extend({
    className: 'geocoder-search-location-prompt',

    template: locationTmpl,

    events: {
        'click': 'selectLocation',
    },

    selectLocation: function() {
        this.model.select();
    }
});

module.exports = {
    GeocoderView: GeocoderView,
    SuggestionsView: SuggestionsView,
    SearchBoxView: SearchBoxView
};
