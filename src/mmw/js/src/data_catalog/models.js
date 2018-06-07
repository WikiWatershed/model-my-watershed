"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    moment = require('moment'),
    settings = require('../core/settings');

var BAD_REQUEST_CODE = 400;
var REQUEST_TIMED_OUT_CODE = 408;
var DESCRIPTION_MAX_LENGTH = 100;
var PAGE_SIZE = settings.get('data_catalog_page_size');
var BIGCZ = settings.get('data_catalog_enabled');

var DATE_FORMAT = 'MM/DD/YYYY';
var WATERML_VARIABLE_TIME_INTERVAL = '{http://www.cuahsi.org/water_ml/1.1/}variable_time_interval';

var SERVICE_PERIODS = {
    'NWISUV':    '1 months', // For NWISUV sites, fetch 1 month of data
    'EnviroDIY': '2 weeks',  // For EnviroDIY, fetch 2 weeks of data
    '*':         '1 years',  // For all else, fetch 1 year of data
};


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
    },

    isDefault: function() {
        window.console.error("Use of unimplemented function",
                             "FilterModel.isDefault");
        return false;
    }
});

var SearchOption = FilterModel.extend({
    defaults: _.defaults({
        active: false,
    }, FilterModel.prototype.defaults),

    isActive: function() {
        return this.get('active');
    },

    isDefault: function() {
        return this.get('active') === this.defaults.active;
    }
});

var GriddedServicesFilter = SearchOption.extend({
    defaults: _.defaults({
        id: 'exclude_gridded',
        type: 'checkbox',
        label: 'Exclude Gridded Services',
        active: true,
    }, SearchOption.prototype.defaults)
});

var PrivateResourcesFilter = SearchOption.extend({
    defaults: _.defaults({
        id: 'exclude_private',
        type: 'checkbox',
        label: 'Exclude Private Resources',
        active: true,
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

    isDefault: function() {
        return _.isEmpty(this.get('fromDate')) &&
               _.isEmpty(this.get('toDate'));
    },

    validate: function() {
        // Only need to validate if there are two dates.  Ensure that
        // before is earlier than after
        var toDate = this.get('toDate'),
            fromDate = this.get('fromDate'),
            isValid = true;

        if (toDate && !moment(toDate, DATE_FORMAT).isValid()) {
            isValid = false;
        }

        if (fromDate && !moment(fromDate, DATE_FORMAT).isValid()) {
            isValid = false;
        }

        if (toDate && fromDate){
            isValid = moment(fromDate, DATE_FORMAT)
                .isBefore(moment(toDate, DATE_FORMAT));
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

    isDefault: function() {
        var isDefault = function(filter) { return filter.isDefault(); };

        return this.every(isDefault);
    }
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
        serverResults: null, // Results collection
        resultCount: 0,
        filters: null, // FiltersCollection
        is_pageable: true,
        page: 1,
        error: '',
        detail_result: null
    },

    initialize: function() {
        var self = this,
            // Debounce search in case of multiple filters
            // changing in rapid succession
            debouncedSearch = _.debounce(function() {
                    if (self.isSearchValid()) {
                        if (self.get('active')) {
                            self.startSearch(1);
                        } else {
                            self.set('stale', true);
                        }
                    }
                }, 100);

        this.get('results').on('change:show_detail', function() {
            self.set('detail_result', self.get('results').getDetail());
        });

        // Initialize and listen to filters for changes
        if (this.get('filters') === null) {
            this.set({ filters: new FilterCollection() });
        }
        this.get('filters').on('change', debouncedSearch);
    },

    searchIfNeeded: function(query, geom) {
        var self = this,
            error = this.get('error'),
            stale = this.get('stale'),
            isCuahsi = this.id === 'cuahsi',
            isSameQuery = query === this.get('query'),
            isSameGeom = geom === this.get('geom'),
            isSameSearch = isSameQuery && isSameGeom;

        // Perform local text search for pre-existing CUAHSI results
        if (isCuahsi && isSameGeom && !isSameQuery) {
            var searchPromise = this.searchPromise || $.when();

            return searchPromise.then(function() {
                self.set({ loading: true });

                var results = self.get('serverResults').textFilter(query);

                self.get('results').reset(results);

                self.set({
                    loading: false,
                    query: query,
                    resultCount: results.length
                });
            });
        }

        // Perform server search
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
            results = this.id === 'cuahsi' ?
                      this.get('serverResults') :
                      this.get('results'),
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

        return results
                   .fetch(request)
                   .done(_.bind(this.doneSearch, this))
                   .fail(_.bind(this.failSearch, this))
                   .always(_.bind(this.finishSearch, this));
    },

    doneSearch: function(response) {
        var data = _.findWhere(response, { catalog: this.id }),
            setFields = {
                page: data.page || 1,
                resultCount: data.count,
            };

        if (this.id === 'cuahsi') {
            var results = this.get('results'),
                filtered = this.get('serverResults')
                               .textFilter(this.get('query'));

            if (results === null) {
                results = new Results(filtered, { catalog: 'cuahsi' });
            } else {
                results.reset(filtered);
            }

            _.assign(setFields, {
                results: results,
                resultCount: results.length,
            });
        }

        this.set(setFields);
    },

    failSearch: function(response, textStatus) {
        if (textStatus === "abort") {
            // Do nothing if the search failed because it
            // was purposefully cancelled
            return;
        }
        if (response.status === BAD_REQUEST_CODE) {
            this.set('error', response.responseJSON &&
                              response.responseJSON.error || "Error");
        } else if (response.status === REQUEST_TIMED_OUT_CODE) {
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
        begin_date: '',
        end_date: '',
        active: false,
        show_detail: false, // Show this result as the detail view?
        variables: null,  // CuahsiVariables Collection
        categories: null, // Cinergi categories, [String]
        fetching: false,
        error: false,
        mode: 'table',
        scimeta: null,  // HydroshareSciMeta
        files: null,  // HydroshareFiles Collection
    },

    initialize: function(attrs) {
        // For CUAHSI
        if (attrs.variables) {
            this.set('variables', new CuahsiVariables(attrs.variables));
        }
    },

    parse: function(response) {
        // For CUAHSI
        if (response.variables) {
            var variables = this.get('variables');
            if (variables instanceof CuahsiVariables) {
                variables.reset(response.variables);
                delete response.variables;
                delete this.fetchPromise;
            }
        }

        return response;
    },

    fetchHydroshareDetails: function() {
        if (this.fetchPromise && !this.get('error')) {
            return this.fetchPromise;
        }

        var self = this,
            id = self.get('id'),
            setSuccess = function() { self.set('error', false); },
            setError = function() { self.set('error', true); },
            startFetch = function() { self.set({ fetching: true, error: false }); },
            endFetch = function() { self.set('fetching', false); },
            fetchSciMeta = function() {
                return $.get('https://www.hydroshare.org/hsapi/resource/' + id + '/scimeta/elements/')
                        .done(function(response) {
                            self.set('scimeta', new HydroshareSciMeta(response));
                        });
            },
            fetchFileList = function() {
                return $.get('https://www.hydroshare.org/hsapi/resource/' + id + '/file_list/')
                        .done(function(response) {
                            if (response.count > 0) {
                                self.set('files', new HydroshareFiles(response.results));
                            }
                        });
            };

        startFetch();
        this.fetchPromise = $.when(fetchSciMeta(), fetchFileList())
                             .done(setSuccess)
                             .fail(setError)
                             .always(endFetch);

        return this.fetchPromise;
    },

    fetchCuahsiValues: function(opts) {
        if (this.fetchPromise && !this.get('error')) {
            return this.fetchPromise;
        }

        opts = _.defaults(opts || {}, {
            onEachSearchDone: _.noop,
            onEachSearchFail: _.noop,
            from_date: null,
            to_date: null,
        });

        var self = this,
            variables = self.get('variables'),
            runSearches = function() {
                    return variables.map(function(v) {
                            return v.search(opts.from_date, opts.to_date)
                                    .done(opts.onEachSearchDone)
                                    .fail(opts.onEachSearchFail);
                        });
                },
            setSuccess = function() {
                    self.set('error', false);
                },
            setError = function() {
                    self.set('error', true);
                },
            startFetch = function() {
                    self.set({
                        fetching: true,
                        error: false,
                    });
                },
            endFetch = function() {
                    self.set('fetching', false);
                };

        startFetch();
        this.fetchPromise = $.get('/bigcz/details', {
                    catalog: 'cuahsi',
                    wsdl: variables.first().get('wsdl'),
                    site: self.get('id'),
                })
                .then(function(response) {
                    variables.forEach(function(v) {
                        var info = response.series[v.get('id')] || null,
                            interval = info && info[WATERML_VARIABLE_TIME_INTERVAL];

                        if (info) {
                            v.set({
                                'units': info.variable.units.abbreviation,
                                'speciation': info.variable.speciation,
                                'data_type': info.variable.data_type,
                                'sample_medium': info.variable.sample_medium,
                            });

                            if (interval) {
                                v.set({
                                    'begin_date': new Date(interval.begin_date_time),
                                    'end_date': new Date(interval.end_date_time),
                                });
                            }
                        }
                    });
                }, function() {
                    // Handle error in /details/
                    setError();
                    endFetch();

                    // Throw error to prevent fetching values
                    throw "Error fetching details, not fetching values.";
                })
                .then(function() {
                    return $.when.apply($, runSearches())
                                 .done(setSuccess)
                                 .fail(setError)  // Handle error in /values/
                                 .always(endFetch);
                });

        return this.fetchPromise;
    },

    textFilter: function(query) {
        var fields = [
            this.get('id').toLowerCase(),
            this.get('title').toLowerCase(),
            (this.get('service_title') || '').toLowerCase(),
            (this.get('service_org') || '').toLowerCase(),
            this.get('sample_mediums').join(' ').toLowerCase(),
            this.get('variables').pluck('concept_keyword').join(' ').toLowerCase(),
        ];

        return _.some(fields, function(field) {
            return field.indexOf(query) >= 0;
        });
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

    topCinergiCategories: function(n) {
        var categories = _.clone(this.get('categories'));

        if (!categories) {
            return null;
        }

        // Truncate if longer than n values
        if (categories.length > n) {
            categories = categories.slice(0, n + 1);
            var lastIdx = categories.length - 1;
            categories[lastIdx] = categories[lastIdx] + '...';
        }

        return categories.join('; ');
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
    },

    textFilter: function(query) {
        var lcQueries = query.toLowerCase().split(' ').filter(function(x) {
            // Exclude empty, search logic terms
            return x !== '' && x !== 'and' && x !== 'or';
        });

        return this.filter(function(result) {
            return _.every(lcQueries, function(lcQuery) {
                return result.textFilter(lcQuery);
            });
        });
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
        concept_keyword: '',
        data_type: '',
        speciation: '',
        sample_medium: '',
        wsdl: '',
        site: '',
        values: null, // CuahsiValues Collection
        most_recent_value: null,
        begin_date: '',
        end_date: '',
        error: null,
    },

    initialize: function() {
        this.set('values', new CuahsiValues());
    },

    search: function(from, to) {
        var self = this,
            begin_date = moment(this.get('begin_date')),
            end_date = moment(this.get('end_date')),
            params = {
                catalog: 'cuahsi',
                wsdl: this.get('wsdl'),
                site: this.get('site'),
                variable: this.get('id'),
            },
            service = params.site.split(':')[0],
            duration = (SERVICE_PERIODS[service] || '1 years').split(' '),
            duration_amount = parseInt(duration[0]),
            duration_unit = duration[1];

        // If neither from date nor to date is specified, set time interval
        // to be either from begin date to end date, or `duration_amount`
        // `duration_units` up to end date, whichever is shorter.
        if (!from || moment(from).isBefore(begin_date)) {
            if (end_date.diff(begin_date, duration_unit, true) > duration_amount) {
                params.from_date = moment(end_date).subtract(duration_amount, duration_unit);
            } else {
                params.from_date = begin_date;
            }
        } else {
            params.from_date = moment(from);
        }

        if (!to || moment(to).isAfter(end_date)) {
            params.to_date = end_date;
        } else {
            params.to_date = moment(to);
        }

        if (params.from_date.format(DATE_FORMAT) ===
            params.to_date.format(DATE_FORMAT)) {
            params.to_date.add(1, 'days');
        }

        params.from_date = params.from_date.format(DATE_FORMAT);
        params.to_date = params.to_date.format(DATE_FORMAT);

        if (params.from_date === 'Invalid date' ||
            params.to_date === 'Invalid date') {
            this.set('error', 'Invalid date');

            return $.Deferred().reject('Invalid date');
        }

        this.set('error', null);

        return this.fetch({
                data: params,
                processData: true,
            })
            .fail(function(error) {
                var detail =
                    (error.responseJSON && error.responseJSON.detail) || '';
                self.set('error',
                    'Error ' + error.status + ' during fetch. ' + detail);
            });
    },

    parse: function(response) {
        var values = this.get('values'),
            ndv = response.variable.no_data_value,
            newValues = response.values,
            variable = {
                name: response.variable.name,
                data_type: response.variable.data_type,
                sample_medium: response.variable.sample_medium,
                units: response.variable.units.abbreviation,
                most_recent_value: null,
            };

        if (newValues === null || newValues === undefined || _.isEmpty(newValues)) {
            this.set('error', 'No values returned from API');
            return variable;
        }

        if (ndv !== null && ndv !== undefined) {
            newValues = _.filter(newValues, function(v) {
                return v.value !== ndv;
            });
        }

        if (_.isEmpty(newValues)) {
            this.set('error', 'No valid values returned from API');
            return variable;
        }

        values.reset(newValues);
        variable.most_recent_value = _.last(newValues).value;

        return variable;
    },

    getChartData: function() {
        return this.get('values').map(function(v) {
            return [
                moment(v.get('datetime')).valueOf(),
                parseFloat(v.get('value'))
            ];
        });
    }
});

var CuahsiVariables = Backbone.Collection.extend({
    model: CuahsiVariable,
});

var HydroshareSciMetaSubject = Backbone.Model.extend({
    defaults: {
        value: '',
    }
});

var HydroshareSciMetaSubjects = Backbone.Collection.extend({
    model: HydroshareSciMetaSubject,
});

var HydroshareSciMetaCreator = Backbone.Model.extend({
    defaults: {
        name: '',
        description: '',
        organization: '',
        email: '',
        address: '',
        phone: '',
        homepage: '',
        order: 0,
    }
});

var HydroshareSciMetaCreators = Backbone.Collection.extend({
    model: HydroshareSciMetaCreator,
});

var HydroshareSciMeta = Backbone.Model.extend({
    defaults: {
        creators: null, // HydroshareSciMetaCreators collection
        subjects: null, // HydroshareSciMetaSubjects collection
        description: '',
    },

    initialize: function(attrs) {
        if (attrs.creators) {
            this.set('creators', new HydroshareSciMetaCreators(attrs.creators));
        }

        if (attrs.subjects) {
            this.set('subjects', new HydroshareSciMetaSubjects(attrs.subjects));
        }
    }
});

var HydroshareFile = Backbone.Model.extend({
    defaults: {
        url: '',
        name: '',
        size: 0,
    },

    initialize: function(attrs) {
        if (attrs.url) {
            this.set('name', attrs.url.substr(attrs.url.lastIndexOf('/') + 1));
        }
    }
});

var HydroshareFiles = Backbone.Collection.extend({
    model: HydroshareFile,
});

var ExpandableListModel = Backbone.Model.extend({
    defaults: {
        expanded: false,
        list_type: '',
        truncate_at: 2,
        list: null
    }
});

function createCatalogCollection() {
    var dateFilter = new DateFilter(),
        catalogs = new Catalogs([
            new Catalog({
                id: 'hydroshare',
                name: 'HydroShare',
                active: true,
                results: new Results(null, { catalog: 'hydroshare' }),
                filters: new FilterCollection([
                    dateFilter,
                    new PrivateResourcesFilter(),
                ]),
            }),
            new Catalog({
                id: 'cuahsi',
                name: 'CUAHSI WDC',
                is_pageable: false,
                results: new Results(null, { catalog: 'cuahsi' }),
                serverResults: new Results(null, { catalog: 'cuahsi' }),
                filters: new FilterCollection([
                    dateFilter,
                    new GriddedServicesFilter(),
                ]),
            }),
            new Catalog({
                id: 'cinergi',
                name: 'CINERGI',
                results: new Results(null, { catalog: 'cinergi' }),
                filters: new FilterCollection([
                    dateFilter,
                ]),
            }),
        ]);

    if (BIGCZ) {
        catalogs.push(new Catalog({
            id: 'usgswqp',
            name: 'WQP',
            is_pageable: false,
            results: new Results(null, { catalog: 'usgswqp' }),
            serverResults: new Results(null, { catalog: 'usgswqp' }),
            filters: new FilterCollection([
                dateFilter,
            ]),
        }));
    }

    return catalogs;
}

module.exports = {
    GriddedServicesFilter: GriddedServicesFilter,
    PrivateResourcesFilter: PrivateResourcesFilter,
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
    ExpandableListModel: ExpandableListModel,
    createCatalogCollection: createCatalogCollection,
};
