"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    moment = require('moment'),
    settings = require('../core/settings');

var REQUEST_TIMED_OUT_CODE = 408;
var DESCRIPTION_MAX_LENGTH = 100;
var PAGE_SIZE = settings.get('data_catalog_page_size');


var FilterModel = Backbone.Model.extend({
    defaults: {
        id: '',
        type: '',
        isValid: true
    },

    reset: function() {
        // Clear all model attributes and set back any defaults.
        // Once we've called `.clear()` we lose the ability to detect
        // actual changed attributes after the `.set()`.
        // Store the prev state to check if a change event
        // should fire
        var prevAttr = _.clone(this.attributes);
        this.clear({ silent: true }).set(this.defaults,
                                         { silent: true });
        if (!_.isEqual(this.attributes, prevAttr)) {
            this.trigger("change", this);
        }
    },

    validate: function() {
        return true;
    },

    isActive: function() {
        window.console.error("Use of unimplemented function",
                             "FilterModel.isActive");
        return false;
    }
});

var SearchOption = FilterModel.extend({
    defaults: _.defaults({
        active: false,
    }, FilterModel.prototype.defaults),

    isActive: function() {
        return this.get('active');
    }
});

var GriddedServicesFilter = SearchOption.extend({
    defaults: _.defaults({
        id: 'gridded',
        type: 'checkbox',
        label: 'Gridded Services',
    }, SearchOption.prototype.defaults)
});

var DateFilter = FilterModel.extend({
    defaults: _.defaults({
        id: 'date',
        type: 'date',
        fromDate: null,
        toDate: null,
    }, FilterModel.prototype.defaults),

    isActive: function() {
        return this.get('fromDate') || this.get('toDate');
    },

    validate: function() {
        // Only need to validate if there are two dates.  Ensure that
        // before is earlier than after
        var dateFormat = "MM/DD/YYYY",
            toDate = this.get('toDate'),
            fromDate = this.get('fromDate'),
            isValid = true;

        if (toDate && !moment(toDate, dateFormat).isValid()) {
            isValid = false;
        }

        if (fromDate && !moment(fromDate, dateFormat).isValid()) {
            isValid = false;
        }

        if (toDate && fromDate){
            isValid = moment(fromDate, dateFormat)
                .isBefore(moment(toDate, dateFormat));
        }

        this.set('isValid', isValid);
        return isValid;
    }
});

var FilterCollection = Backbone.Collection.extend({
    model: FilterModel,

    countActive: function() {
        var isActive = function(filter) { return filter.isActive(); };

        return this.filter(isActive).length;
    },
});

var Catalog = Backbone.Model.extend({
    defaults: {
        id: '',
        name: '',
        description: '',
        query: '',
        geom: '',
        loading: false,
        stale: false, // Should search run when catalog becomes active?
        active: false,
        results: null, // Results collection
        resultCount: 0,
        filters: null, // FiltersCollection
        is_pageable: true,
        page: 1,
        error: '',
        detail_result: null
    },

    initialize: function() {
        var self = this;
        this.get('results').on('change:show_detail', function() {
            self.set('detail_result', self.get('results').getDetail());
        });

        // Initialize and listen to filters for changes
        if (this.get('filters') === null) {
            this.set({ filters: new FilterCollection() });
        }
        this.get('filters').on('change', function() {
            if (self.isSearchValid()) {
                if (self.get('active')) {
                    self.startSearch(1);
                } else {
                    self.set('stale', true);
                }
            }
        });
    },

    searchIfNeeded: function(query, geom) {
        var self = this,
            error = this.get('error'),
            stale = this.get('stale'),
            isSameSearch = query === this.get('query') &&
                           geom === this.get('geom');

        if (!isSameSearch || stale || error) {
            this.cancelSearch();
            this.searchPromise = this.search(query, geom)
                                     .always(function() {
                                        delete self.searchPromise;
                                     });
        }

        return this.searchPromise || $.when();
    },

    cancelSearch: function() {
        if (this.searchPromise) {
            this.searchPromise.abort();
        }
    },

    search: function(query, geom) {
        this.set({
            query: query,
            geom: geom,
        });

        return this.startSearch(1);
    },

    isSearchValid: function() {
        var query = this.get('query'),
            validate = function(filter) { return filter.validate(); },
            valid = this.get('filters').map(validate);

        return query && _.every(valid);
    },

    startSearch: function(page) {
        var filters = this.get('filters'),
            dateFilter = filters.findWhere({ id: 'date' }),
            fromDate = null,
            toDate = null;

        if (dateFilter) {
            fromDate = dateFilter.get('fromDate');
            toDate = dateFilter.get('toDate');
        }

        var lastPage = Math.ceil(this.get('resultCount') / PAGE_SIZE),
            thisPage = parseInt(page) || 1,
            isSearchOption = function(filter) { return filter instanceof SearchOption; },
            searchOptions = filters.filter(isSearchOption),
            data = {
                catalog: this.id,
                query: this.get('query'),
                geom: this.get('geom'),
                from_date: fromDate,
                to_date: toDate,
            };

        if (thisPage > 1 && thisPage <= lastPage) {
            _.assign(data, { page: thisPage });
        }

        if (searchOptions && searchOptions.length > 0) {
            var isActive = function(option) { return option.isActive(); },
                id = function(option) { return option.get('id'); };
            _.assign(data, {
                options: _.map(_.filter(searchOptions, isActive), id).join(',')
            });
        }

        this.set('loading', true);
        this.set('error', false);

        var request = {
            data: JSON.stringify(data),
            type: 'POST',
            dataType: 'json',
            contentType: 'application/json'
        };

        return this.get('results')
                   .fetch(request)
                   .done(_.bind(this.doneSearch, this))
                   .fail(_.bind(this.failSearch, this))
                   .always(_.bind(this.finishSearch, this));
    },

    doneSearch: function(response) {
        var data = _.findWhere(response, { catalog: this.id });

        this.set({
            page: data.page || 1,
            resultCount: data.count,
        });
    },

    failSearch: function(response, textStatus) {
        if (textStatus === "abort") {
            // Do nothing if the search failed because it
            // was purposefully cancelled
            return;
        }
        if (response.status === REQUEST_TIMED_OUT_CODE){
            this.set('error', "Searching took too long. " +
                              "Consider trying a smaller area of interest " +
                              "or a more specific search term.");
        } else {
            this.set('error', "Error");
        }
    },

    finishSearch: function() {
        this.set({
            loading: false,
            stale: false,
        });
    },

    previousPage: function() {
        var page = this.get('page');

        if (page > 1) {
            return this.startSearch(page - 1);
        } else {
            return $.when();
        }
    },

    nextPage: function() {
        var page = this.get('page'),
            count = this.get('resultCount'),
            lastPage = Math.ceil(count / PAGE_SIZE);

        if (page < lastPage) {
            return this.startSearch(page + 1);
        } else {
            return $.when();
        }
    }
});

var Catalogs = Backbone.Collection.extend({
    model: Catalog,

    getActiveCatalog: function() {
        return this.findWhere({ active: true });
    }
});

var Result = Backbone.Model.extend({
    defaults: {
        id: '',
        title: '',
        description: '',
        geom: null, // GeoJSON
        links: null, // Array
        created_at: '',
        updated_at: '',
        active: false,
        show_detail: false // Show this result as the detail view?
    },

    getSummary: function() {
        var text = this.get('description') || '';
        if (text.length <= DESCRIPTION_MAX_LENGTH) {
            return text;
        }
        var truncated = text.substr(0,
            text.indexOf(' ', DESCRIPTION_MAX_LENGTH));
        return truncated + '&hellip;';
    },

    getDetailsUrl: function() {
        var links = this.get('links') || [],
            detailsUrl = _.findWhere(links, { type: 'details' });
        return detailsUrl && detailsUrl.href;
    },

    toJSON: function() {
        return _.assign({}, this.attributes, {
            summary: this.getSummary(),
            detailsUrl: this.getDetailsUrl()
        });
    }
});

var Results = Backbone.Collection.extend({
    url: '/bigcz/search',
    model: Result,

    initialize: function(models, options) {
        this.catalog = options.catalog;
    },

    parse: function(response) {
        return _.findWhere(response, { catalog: this.catalog }).results;
    },

    getDetail: function() {
        return this.findWhere({ show_detail: true});
    },

    showDetail: function(result) {
        var currentDetail = this.getDetail();

        if (currentDetail) {
            // Do nothing if the selected result is already the detail shown
            if (currentDetail.get('id') === result.get('id')) {
                return;
            }
            // Turn off the actively shown detail. There should only be
            // one with `show_detail` true at a time
            currentDetail.set('show_detail', false);
        }

        result.set('show_detail', true);
    },

    closeDetail: function() {
        var currentDetail = this.getDetail();

        if (!currentDetail) {
            return;
        }

        currentDetail.set('show_detail', false);
    }
});

var SearchForm = Backbone.Model.extend({
    defaults: {
        query: '',
    }
});

var PopoverControllerModel = Backbone.Model.extend({
    defaults: {
        activeResult: null // Result
    }
});

var CuahsiValue = Backbone.Model.extend({
    defaults: {
        source_id: '',
        source_code: '',
        quality_control_level_code: '',
        value: null,
        datetime: '',
        date_time_utc: '',
        time_offset: '',
    }
});

var CuahsiValues = Backbone.Collection.extend({
    model: CuahsiValue,
});

var CuahsiVariable = Backbone.Model.extend({
    url: '/bigcz/values',

    defaults: {
        id: '',
        name: '',
        units: '',
        display_name: '',
        wsdl: '',
        site: '',
        values: null, // CuahsiValues Collection
        most_recent_value: null,
    },

    initialize: function() {
        this.set('values', new CuahsiValues());
    },

    search: function(from_date, to_date) {
        var params = {
                catalog: 'cuahsi',
                wsdl: this.get('wsdl'),
                site: this.get('site'),
                variable: this.get('id'),
                from_date: from_date,
                to_date: to_date,
            };

        return this.fetch({
            data: params,
            processData: true,
        });
    },

    parse: function(response) {
        var mrv = null;

        if (response.values) {
            var values = this.get('values');

            values.reset(response.values);
            mrv = response.values[response.values.length - 1].value

            delete response.values;
        }

        return {
            name: response.variable.name,
            units: response.variable.units.abbreviation,
            most_recent_value: mrv,
        };
    }
});

var CuahsiVariables = Backbone.Collection.extend({
    model: CuahsiVariable,

    search: function(opts) {
        var searches = this.map(function(v) {
                // We attach `onEachPromise` handler via `done`
                // rather than `then` because we want to return
                // the `search` promise, not the `onEachPromise`
                // promise.
                return v.search(opts.from_date, opts.to_date)
                        .done(opts.onEachPromise);
            });

        return $.when.apply($, searches);
    }
});

module.exports = {
    GriddedServicesFilter: GriddedServicesFilter,
    DateFilter: DateFilter,
    FilterCollection: FilterCollection,
    Catalog: Catalog,
    Catalogs: Catalogs,
    Result: Result,
    Results: Results,
    SearchForm: SearchForm,
    PopoverControllerModel: PopoverControllerModel,
    CuahsiValue: CuahsiValue,
    CuahsiValues: CuahsiValues,
    CuahsiVariable: CuahsiVariable,
    CuahsiVariables: CuahsiVariables,
};
