"use strict";

require('./setup');

var $ = require('jquery'),
    assert = require('chai').assert,
    _ = require('lodash'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('../../shim/backbone'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    sinon = require('sinon'),
    App = require('../app'),
    LayerPickerView = require('./layerPicker'),
    views = require('./views'),
    models = require('./models'),
    AppRouter = require('../router').AppRouter,
    settings = require('./settings'),
    utils = require('./utils'),
    testUtils = require('./testUtils');

var TEST_SHAPE = {
    'type': 'Feature',
    'geometry': {
        'type': 'Polygon',
        'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
    }
};

var sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId;

assert.almostEqual = function(actual, expected, message) {
    return assert.equal(utils.round(actual, 5), utils.round(expected, 5), message);
};

describe('Core', function() {
    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }
        settings.set('map_controls', [
            'LayerAttribution',
            'LayerSelector',
            'LocateMeButton',
            'ZoomControl',
            'FitToAoiControl',
        ]);
    });

    beforeEach(function() {
    });

    afterEach(function() {
        $(sandboxSelector).remove();
        $('<div>', {id: sandboxId}).appendTo('body');

        // App adds a LoginModalView to the body
        // so we need to remove it.
        $('.modal').remove();
        window.location.hash = '';
        Backbone.history.stop();
        testUtils.resetApp(App);
    });

    after(function() {
        $(sandboxSelector).remove();
    });

    describe('Views', function() {
        describe('MapView', function() {
            before(function() {
                // Ensure that map controls are enabled before testing

                settings.set('map_controls', [
                    'LayerAttribution',
                    'LayerSelector',
                    'LocateMeButton',
                    'ZoomControl',
                ]);
            });

            it('adds layers to the map when the map model attribute areaOfInterest is set', function() {
                var model = new models.MapModel(),
                    layerTabCollection = new models.LayerTabCollection(null),
                    view = new views.MapView({
                        model: model,
                        layerTabCollection: layerTabCollection,
                        el: sandboxSelector
                    }),
                    featureGroup = view._areaOfInterestLayer;

                assert.equal(featureGroup.getLayers().length, 0);
                model.set('areaOfInterest', TEST_SHAPE);
                assert.equal(featureGroup.getLayers().length, 1);
                model.set('areaOfInterest', null);
                assert.equal(featureGroup.getLayers().length, 0);

                view.destroy();
            });

            it('updates the position of the map when the map model location attributes are set', function() {
                var model = new models.MapModel(),
                    layerTabCollection = new models.LayerTabCollection(null),
                    view = new views.MapView({
                        model: model,
                        layerTabCollection: layerTabCollection,
                        el: sandboxSelector
                    }),
                    latLng = [40, -75],
                    zoom = 18;

                view._leafletMap.setView([0, 0], 0);

                model.set({ lat: latLng[0], lng: latLng[1], zoom: zoom });

                assert.almostEqual(view._leafletMap.getCenter().lat, latLng[0]);
                assert.almostEqual(view._leafletMap.getCenter().lng, latLng[1]);
                assert.almostEqual(view._leafletMap.getZoom(), zoom);

                view.destroy();
            });

            it('silently sets the map model location attributes when the map position is updated', function() {
                var model = new models.MapModel(),
                    layerTabCollection = new models.LayerTabCollection(null),
                    view = new views.MapView({
                        model: model,
                        layerTabCollection: layerTabCollection,
                        el: sandboxSelector
                    }),
                    latLng = [40, -75],
                    zoom = 18;

                view._leafletMap.setView(latLng, zoom);

                assert.almostEqual(model.get('lat'), 40);
                assert.almostEqual(model.get('lng'), -75);
                assert.almostEqual(model.get('zoom'), zoom);

                view.destroy();
            });

            it('adds the sidebar class for the analyze size', function(){
                var model = new models.MapModel(),
                    layerTabCollection = new models.LayerTabCollection(null),
                    view = new views.MapView({
                        model: model,
                        layerTabCollection: layerTabCollection,
                        el: sandboxSelector
                    }),
                    $container = $(sandboxSelector).parent();

                model.setAnalyzeSize();
                assert.isTrue($container.hasClass('-sidebar'));
                assert.isFalse($container.hasClass('-projectheader'));
                assert.isFalse($container.hasClass('-toolbarheader'));

                view.destroy();
            });

            it('adds the sidebar and header class for the model size', function(){
                var model = new models.MapModel(),
                    layerTabCollection = new models.LayerTabCollection(null),
                    view = new views.MapView({
                        model: model,
                        layerTabCollection: layerTabCollection,
                        el: sandboxSelector
                    }),
                    $container = $(sandboxSelector).parent();

                model.setModelSize();
                assert.isTrue($container.hasClass('-sidebar'));
                assert.isTrue($container.hasClass('-toolbarheader'));

                view.destroy();
            });
        });

        describe('LayerPickerView', function() {
            it('creates a layer picker with the correct items', function() {
                var baseLayers = [
                    {
                        'url': 'https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png',
                        'default': true,
                        'display': 'A',
                    },
                    {
                        'url': 'https://{s}.tiles.mapbox.com/v3/examples.map-i86nkdio/{z}/{x}/{y}.png',
                        'display': 'B',
                    }
                ];
                settings.set('base_layers', baseLayers);

                var collection = new models.LayerTabCollection(null),
                    view = new LayerPickerView({
                        collection: collection,
                        leafletMap: App.getLeafletMap(),
                        // The basemaps are currently the 5th tab in the
                        // layerpicker
                        defaultActiveTabIndex: 4,
                    });

                    $(sandboxSelector).html(view.render().el);
                    view.triggerMethod('show');

                    var $layers = $(sandboxSelector).find('#layerpicker-layers'),
                    layerNames = $layers.find('button').map(function() {
                        return $(this).text().trim();
                    }).get();

                assert.equal(layerNames.length, 2, 'Did not add layer selector');
                assert.deepEqual(layerNames, _.map(baseLayers, 'display'));

                view.destroy();
            });
        });

        describe('ModificationPopupView', function() {
            it('deletes the modification it is associated with when the delete button is clicked', function() {
                var model = new Backbone.Model({
                        value: 'developed_low',
                        shape: {},
                        area: 100,
                        units: 'm²',
                    }),
                    view = new views.ModificationPopupView({ model: model, editable: true});
                var spy = sinon.spy(model, 'destroy');

                $(sandboxSelector).html(view.render().el);
                $(sandboxSelector + ' .delete-modification').trigger('click');
                assert.equal(spy.callCount, 1);

                view.destroy();
            });

            it('does not show a delete button if the project is not editable', function() {
                var model = new Backbone.Model({
                    value: 'developed_low',
                    shape: {},
                    area: 100,
                    units: 'm²',
                }),
                    view = new views.ModificationPopupView({ model: model, editable: false});

                $(sandboxSelector).html(view.render().el);
                assert.equal($(sandboxSelector + ' .delete-modification').length, 0, 'Expected no dom elements to have the .delete-modification class.');

                view.destroy();
            });
        });
    });

    describe('Models', function() {
        describe('GeoModel', function() {
            describe('#setDisplayArea', function() {
                it('calculates and sets the area attribute to sq. m. if the area is less than 1 sq. km.', function() {
                    var model = new models.GeoModel({
                        shape: polygon270m
                    });

                    assert.equal(Math.round(model.get('area')), 270);
                    assert.equal(model.get('units'), 'm²');
                });

                it('calculates and sets the area attribute to sq. km. if the area is greater than 1,000 sq. m.', function() {
                    var model = new models.GeoModel({
                        shape: polygon7Km
                    });

                    assert.equal(Math.round(model.get('area')), 7);
                    assert.equal(model.get('units'), 'km²');
                });

                it('sets the provided fields instead of the defaults if arguments are passed', function() {
                    var model = new models.GeoModel({
                        effectiveShape: polygon7Km,
                        effectiveArea: 0,
                        effectiveUnits: ''
                    });

                    model.setDisplayArea('effectiveShape', 'effectiveArea', 'effectiveUnits');
                    assert.equal(Math.round(model.get('effectiveArea')), 7);
                    assert.equal(model.get('effectiveUnits'), 'km²');
                });
            });
        });

        describe('TaskModel', function() {
            beforeEach(function() {
                this.pollingDefer = $.Deferred();
                this.startJob = '1';
                this.taskModel = new models.TaskModel({
                    pollInterval: 100,
                    timeout: 200,
                    taskType: 'mmw/modeling',
                    taskName: 'tr55',
                    job: this.startJob
                });
                this.taskHelper = {
                    postData: {},
                    onStart: _.noop,
                    pollSuccess: _.noop,
                    pollFailure: _.noop,
                    pollEnd: _.noop,
                    startFailure: _.noop
                };
                this.onStartSpy = sinon.spy(this.taskHelper, 'onStart');
                this.pollSuccessSpy = sinon.spy(this.taskHelper, 'pollSuccess');
                this.pollFailureSpy = sinon.spy(this.taskHelper, 'pollFailure');
                this.pollEndSpy = sinon.spy(this.taskHelper, 'pollEnd');
                this.startFailureSpy = sinon.spy(this.taskHelper, 'startFailure');
                this.isDone = false;
                this.server = sinon.fakeServer.create();
                this.server.respondImmediately = true;
                this.startResponse = {
                    job: this.startJob
                };
                this.pollingResponse = {
                    status: 'complete'
                };
                this.server.respondWith('POST', '/mmw/modeling/tr55/',
                                        [ 200,
                                          { 'Content-Type': 'application/json' },
                                          JSON.stringify(this.startResponse) ]);
                this.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                        [ 200,
                                          { 'Content-Type': 'application/json' },
                                          JSON.stringify(this.pollingResponse) ]);
            });

            it('resolves promise when response status is complete', function(done) {
                var self = this;
                self.taskModel.pollForResults(self.pollingDefer)
                    .done(function() {
                        self.isDone = true;
                    }).fail(function() {
                    }).always(function(response) {
                        assert(self.isDone, 'Promise was not resolved');
                        assert.equal(response.status, 'complete',
                                        'Response was not returned or status is not complete');
                        done();
                    });
            });

            it('rejects promise when timeout occurs', function(done) {
                var self = this;
                self.pollingResponse = {
                    status: '' // Status is never complete, so times out.
                };
                self.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                    [ 200,
                                        { 'Content-Type': 'application/json' },
                                        JSON.stringify(self.pollingResponse) ]);

                self.taskModel.pollForResults(self.pollingDefer)
                    .done(function() {
                        self.isDone = true;
                    }).fail(function() {
                    }).always(function() {
                        assert.isFalse(self.isDone, 'Promise was resolved');
                        done();
                    });
            });

            it('rejects promise after reset() is called', function(done) {
                var self = this;
                self.pollingResponse = {
                    status: ''
                };
                self.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                        [ 200,
                                            { 'Content-Type': 'application/json' },
                                            JSON.stringify(self.pollingResponse) ]);

                var pollingPromise = self.taskModel.pollForResults(self.pollingDefer);
                self.taskModel.reset();
                pollingPromise.done(function() {
                    self.isDone = true;
                }).fail(function(failObject) {
                    assert.equal(failObject.cancelledJob, self.startJob, 'Cancelled job was not start job');
                }).always(function() {
                    assert.isFalse(self.isDone, 'Promise was resolved');
                    done();
                });
            });

            it('rejects promise when request is bad', function(done) {
                var self = this;
                self.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                        [ 400, // Bad request
                                            { 'Content-Type': 'application/json' },
                                            JSON.stringify(self.pollingResponse) ]);

                var pollingPromise = self.taskModel.pollForResults(self.pollingDefer);
                pollingPromise.done(function() {
                    self.isDone = true;
                }).fail(function() {
                }).always(function() {
                    assert.isFalse(self.isDone, 'Promise was resolved');
                    done();
                });
            });

            it('calls onStart and startFailure if initial fetch fails', function(done) {
                var self = this;
                self.server.respondWith('POST', '/mmw/modeling/tr55/',
                                    [ 400, // Make initial fetch fail.
                                        { 'Content-Type': 'application/json' },
                                        JSON.stringify(self.startResponse) ]);

                var startPromises = self.taskModel.start(self.taskHelper);
                startPromises.startPromise.done(function() {
                    self.isDone = true;
                }).fail(function() {
                    assert(self.onStartSpy.calledOnce, 'onStart not called once');
                    assert(self.startFailureSpy.calledOnce, 'startFailure not called once');
                }).always(function() {
                    assert.isFalse(self.isDone, 'Promise was resolved despite fetch failure');
                    done();
                });
            });

            it('calls pollSuccess and pollEnd if polling successful', function(done) {
                var self = this,
                    startPromises = self.taskModel.start(self.taskHelper);

                startPromises.pollingPromise.done(function() {
                    self.isDone = true;
                    assert(self.pollSuccessSpy.calledOnce, 'pollSuccess not called once');
                    assert(self.pollEndSpy.calledOnce, 'pollEndSpy not called once');
                }).fail(function() {
                }).always(function() {
                    assert(self.isDone, 'Promise was rejected');
                    done();
                });
            });

            it('calls pollFailure and pollEnd if polling fails', function(done) {
                var self = this;
                self.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                    [ 400, // Make polling fail
                                        { 'Content-Type': 'application/json' },
                                        JSON.stringify(self.pollingResponse) ]);

                var startPromises = self.taskModel.start(self.taskHelper);
                startPromises.pollingPromise.done(function() {
                    self.isDone = true;
                }).fail(function() {
                    assert(self.pollFailureSpy.calledOnce, 'pollFailure not called once');
                    assert(self.pollEndSpy.calledOnce, 'pollEndSpy not called once');
                }).always(function() {
                    assert.isFalse(self.isDone, 'Promise was resolved');
                    done();
                });
            });

        });
    });

    describe('Regions', function() {
        describe('TransitionRegion', function() {
            it('calls view.animateIn and executes the correct animation when show is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateIn', function() {
                    assert.equal($('.test-subview').css('height'), '50%');
                    views.destroy();
                    done();
                });

                views.testParentView.testRegion.show(views.testSubView);
            });

            it('calls view.animateOut and executes the correct animation when empty is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateOut', function() {
                    assert.equal($('.test-subview').css('height'), '0%');
                    views.destroy();
                    done();
                });

                views.testParentView.testRegion.show(views.testSubView);
                views.testParentView.testRegion.empty();
            });
        });
    });

    describe('AppRouter', function() {
        it('executes a route\'s prepare function before navigating to that route', function() {
            var controller = getController(),
                router = new AppRouter(),
                spy = sinon.spy(controller, 'fooPrepare');

            router.addRoute(/^foo/, controller, 'foo');

            Backbone.history.start();

            router.navigate('foo', { trigger: true });

            assert.equal(spy.callCount, 1);
        });

        it('executes a route\'s cleanUp function before navigating to a new route', function(done) {
            var controller = getController(),
                router = new AppRouter(),
                barCleanUpSpy = sinon.spy(controller, 'barCleanUp'),
                fooPrepareSpy = sinon.spy(controller, 'fooPrepare');

            // Run the tests in the route function that is called last
            controller.foo = function() {
                assert.isTrue(barCleanUpSpy.calledBefore(fooPrepareSpy));
                assert.isTrue(fooPrepareSpy.calledAfter(barCleanUpSpy));
                done();
            };

            router.addRoute(/^bar/, controller, 'bar');
            router.addRoute(/^foo/, controller, 'foo');

            Backbone.history.start();

            router.navigate('bar', { trigger: true });
            router.navigate('foo', { trigger: true });
        });

        it('executes the prepare, route, and cleanUp functions in the correct order', function(done) {
            var controller = getController(),
                router = new AppRouter(),
                fooPrepareSpy = sinon.spy(controller, 'fooPrepare'),
                fooSpy = sinon.spy(controller, 'foo'),
                fooCleanUpSpy = sinon.spy(controller, 'fooCleanUp'),
                barPrepareSpy = sinon.spy(controller, 'barPrepare');

            // Run the tests in the route function that is called last
            controller.bar = function() {
                // Go to #foo
                assert.isTrue(fooPrepareSpy.calledBefore(fooSpy));
                assert.isTrue(fooSpy.calledAfter(fooPrepareSpy));

                // Go to #bar
                assert.isTrue(fooCleanUpSpy.calledBefore(barPrepareSpy));
                assert.isTrue(barPrepareSpy.calledAfter(fooCleanUpSpy));
                assert.isTrue(barSpy.calledAfter(barPrepareSpy));

                done();
            };

            var barSpy = sinon.spy(controller, 'bar');

            router.addRoute(/^foo/, controller, 'foo');
            router.addRoute(/^bar/, controller, 'bar');

            Backbone.history.start();

            router.navigate('foo', { trigger: true });
            router.navigate('bar', { trigger: true });
        });

        it('does not execute a route if that route\'s prepare function returns false', function() {
            var controller = getController(),
                router = new AppRouter(),
                spy = sinon.spy(controller, 'blah');

            router.addRoute(/^foo/, controller, 'foo');
            router.addRoute(/^bar/, controller, 'bar');
            router.addRoute(/^blah/, controller, 'blah');

            Backbone.history.start();

            router.navigate('bar', { trigger: true });
            // blahPrepare returns false
            router.navigate('blah', { trigger: true });

            assert.equal(spy.callCount, 0);
        });

        it('does not navigated to the route associated with a prepare function that returns false', function() {
            var controller = getController(),
                router = new AppRouter(),
                otherController = getOtherController(router),
                spy = sinon.spy(controller, 'foo'),
                otherSpy = sinon.spy(otherController, 'bazCleanUp');

            router.addRoute(/^foo/, controller, 'foo');
            router.addRoute(/^baz/, otherController, 'baz');

            Backbone.history.start();

            router.navigate('baz', { trigger: true });
            router.navigate('foo', { trigger: true });

            // if bazCleanup was never run then evidently the baz
            // route was never navigated to.
            assert.equal(spy.callCount, 1);
            assert.equal(otherSpy.callCount, 0);
        });

        it('does not execute route A\'s cleanUp function when navigating to route B if route A\'s prepare ' +
           'function returned false (i.e. route A was never navigated to)', function() {

            var controller = getController(),
                router = new AppRouter(),
                spy = sinon.spy(controller, 'blahCleanUp');

            router.addRoute(/^foo/, controller, 'foo');
            router.addRoute(/^bar/, controller, 'bar');
            router.addRoute(/^blah/, controller, 'blah');


            router.navigate('bar', { trigger: true });
            // blahPrepare returns false
            router.navigate('blah', { trigger: true });
            router.navigate('foo', { trigger: true });

            assert.equal(spy.callCount, 0);
        });
    });

    describe('CSRF', function() {
        beforeEach(function() {
           this.xhr = sinon.useFakeXMLHttpRequest();
           var requests = this.requests = [];

           this.xhr.onCreate = function(req) { requests.push(req); };
           document.cookie = 'csrftoken=fakecsrftoken';
        });

        afterEach(function() {
            this.xhr.restore();
        });

        it('doesn\'t attach CSRF tokens to internal GET/HEAD/OPTIONS/TRACE requests', function() {
            var requestMethods = [
                'GET',
                'HEAD',
                'OPTIONS',
                'TRACE'
            ];

            _.forEach(requestMethods, function(method) {
                $.ajax({
                    method: method,
                    url: '/foo',
                    success: function(data) {
                        sinon.spy(null, data);
                    }
                });
            });

            for(var i=0; i<this.requests.length; i++) {
                assert.notProperty(this.requests[i].requestHeaders, 'X-CSRFToken');
            }
        });

        it('attaches CSRF tokens to internal POST/PUT/DELETE requests', function() {
            var requestMethods = [
                'POST',
                'PUT',
                'DELETE'
            ];

            _.forEach(requestMethods, function(method) {
                $.ajax({
                    method: method,
                    url: '/foo',
                    success: function(data) {
                        sinon.spy(null, data);
                    }
                });
            });

            for(var i=0; i<this.requests.length; i++) {
                assert.property(this.requests[i].requestHeaders, 'X-CSRFToken');
                assert.equal(this.requests[i].requestHeaders['X-CSRFToken'], 'fakecsrftoken');
            }
        });

        it('doesn\'t attach CSRF tokens to external requests over HTTP', function() {
            var requestMethods = [
                'GET',
                'HEAD',
                'OPTIONS',
                'TRACE',
                'POST',
                'PUT',
                'DELETE',
                'PATCH'
            ];

            _.forEach(requestMethods, function(method) {
                $.ajax({
                    method: method,
                    url: 'http://www.example.com',
                    success: function(data) {
                        sinon.spy(null, data);
                    }
                });
            });

            for(var i=0; i<this.requests.length; i++) {
                assert.notProperty(this.requests[i].requestHeaders, 'X-Requested-With');
                assert.notProperty(this.requests[i].requestHeaders, 'X-CSRFToken');
            }
        });

        it('doesn\'t attach CSRF tokens to external requests over HTTPS', function() {
            var requestMethods = [
                'GET',
                'HEAD',
                'OPTIONS',
                'TRACE',
                'POST',
                'PUT',
                'DELETE',
                'PATCH'
            ];

            _.forEach(requestMethods, function(method) {
                $.ajax({
                    method: method,
                    url: 'https://www.secure-example.com',
                    success: function(data) {
                        sinon.spy(null, data);
                    }
                });
            });

            for(var i=0; i<this.requests.length; i++) {
                assert.notProperty(this.requests[i].requestHeaders, 'X-Requested-With');
                assert.notProperty(this.requests[i].requestHeaders, 'X-CSRFToken');
            }
        });
    });

    describe('Utils', function() {
        it('calculates range in magnitude correctly', function() {
            assert.deepEqual(utils.rangeInMagnitude(50), {min: 0, max: 100});
            assert.deepEqual(utils.rangeInMagnitude(8), {min: 0, max: 10});
            assert.deepEqual(utils.rangeInMagnitude(0.314), {min: 0, max: 1});
            assert.deepEqual(utils.rangeInMagnitude(0), {min: 0, max: 1});
            assert.deepEqual(utils.rangeInMagnitude(10), {min: 0, max: 10});
            assert.deepEqual(utils.rangeInMagnitude(-0.005), {min: -0.01, max: 0});
        });

        it('parses version numbers correctly', function() {
            var latestUrl = 'https://github.com/WikiWatershed/model-my-watershed/releases/latest',
                taggedUrl = 'https://github.com/WikiWatershed/model-my-watershed/releases/tag/1.22.0',
                gitDescribe = '1.21.0-131-g9e49b30ce4f5b641e41c96f49c0a1509b21261b2',
                output = null;

            output = utils.parseVersion(null, null);
            assert.equal(output.version, 'Unknown');
            assert.equal(output.releaseNotesUrl, latestUrl);

            output = utils.parseVersion('origin/release/1.22.0', gitDescribe);
            assert.equal(output.version, '1.22.0');
            assert.equal(output.releaseNotesUrl, taggedUrl);

            output = utils.parseVersion('release/1.22.0', gitDescribe);
            assert.equal(output.version, '1.22.0');
            assert.equal(output.releaseNotesUrl, taggedUrl);

            output = utils.parseVersion('origin/hotfix/1.22.2', gitDescribe);
            assert.equal(output.version, '1.22.2');
            assert.equal(output.releaseNotesUrl, taggedUrl);

            output = utils.parseVersion('hotfix/1.22.2', gitDescribe);
            assert.equal(output.version, '1.22.2');
            assert.equal(output.releaseNotesUrl, taggedUrl);

            output = utils.parseVersion('develop', gitDescribe);
            assert.equal(output.version, '1.21.0-131-g9e49b3');
            assert.equal(output.releaseNotesUrl, latestUrl);

            output = utils.parseVersion('tt/version-number', gitDescribe);
            assert.equal(output.version, '1.21.0-131-g9e49b3');
            assert.equal(output.releaseNotesUrl, latestUrl);

            output = utils.parseVersion('local', null);
            assert.equal(output.version, 'Local');
            assert.equal(output.releaseNotesUrl, latestUrl);
        });

        it('parses coordinates correctly', function() {
            var lngLat = '-75.1542379,39.9614307',
                latLng = '39.9614307,-75.1542379',
                address = '990 Spring Garden, St',
                hucName = 'Lower Schuylkill',
                zipCode = '19123',
                mexico = '23.294249,-111.6364102',
                spain = '40.1217811,-8.200797',
                africa = '2.1500228,5.2076582',
                empty = '',
                correct = { lat: 39.9614307, lng: -75.1542379 };

            assert.deepEqual(utils.parseLocation(latLng), correct);
            assert.deepEqual(utils.parseLocation(lngLat), correct);
            assert.equal(utils.parseLocation(address), false);
            assert.equal(utils.parseLocation(hucName), false);
            assert.equal(utils.parseLocation(zipCode), false);
            assert.equal(utils.parseLocation(mexico), false);
            assert.equal(utils.parseLocation(spain), false);
            assert.equal(utils.parseLocation(africa), false);
            assert.equal(utils.parseLocation(empty), false);
            assert.equal(utils.parseLocation(null), false);
            assert.equal(utils.parseLocation(), false);
        });
    });
});

function createTransitionRegionWithAnimatedHeightView(displayHeight, hiddenHeight) {
    var TestParentView = Marionette.LayoutView.extend({
            el: sandboxId,
            regions: {
                testRegion: {
                    regionClass: TransitionRegion,
                    selector: sandboxSelector
                }
            }
        }),
        TestSubView = Marionette.ItemView.extend({
            template: false,
            className: 'test-subview',
            transitionInCss: {
                height: hiddenHeight
            },

            animateIn: function() {
                this.$el.animate({ height: displayHeight }, 400,
                    _.bind(this.trigger, this, 'animateIn')
                );
            },

            animateOut: function() {
                this.$el.animate({ height: hiddenHeight }, 100,
                    _.bind(this.trigger, this, 'animateOut')
                );
            }
        }),
        testParentView = new TestParentView({}),
        testSubView = new TestSubView({});

    return {
        destroy: function() {
            testSubView.destroy();
            testParentView.destroy();
        },
        testParentView: testParentView,
        testSubView: testSubView
    };
}

function getOtherController(router) {
    var controller = {
        bazPrepare: function() {
            console.log('bazPrepare');
            router.navigate('bar', { trigger: true });
            return false;
        },
        baz: function() {
            console.log('baz');
        },
        bazCleanUp: function() {
            console.log('bazCleanUp');
        }
    };

    return controller;
}

function getController() {
    var controller = {
            fooPrepare: function() {
                console.log('fooPrepare');
                return true;
            },
            foo: function() {
                console.log('foo');
                return true;
            },
            fooCleanUp: function() {
                console.log('fooCleanUp');
            },
            barPrepare: function() {
                console.log('barPrepareStart');
                var defer = new $.Deferred();

                setTimeout(function() {
                    console.log('barPrepareResolve');
                    defer.resolve();
                }, 500);

                return defer.promise();
            },
            bar: function() {
                console.log('bar');
            },
            barCleanUp: function() {
                console.log('barCleanUp');
            },
            blahPrepare: function() {
                console.log('blahPrepare');
                return false;
            },
            blah: function() {
                console.log('blah');
            },
            blahCleanUp: function() {
                console.log('blahCleanUp');
            }
    };

    return controller;
}

var polygon7Km = { "type": "FeatureCollection", "features": [ { "type": "Feature", "properties": { "stroke": "#555555", "stroke-width": 2, "stroke-opacity": 1, "fill": "#555555", "fill-opacity": 0.5 }, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17231941223145, 39.96955588282636 ], [ -75.17798423767088, 39.94560797785181 ], [ -75.15000343322754, 39.945213161909656 ], [ -75.14073371887207, 39.96784559630992 ], [ -75.1606035232544, 39.971134570861665 ], [ -75.17231941223145, 39.96955588282636 ] ] ] } } ] };

var polygon270m =  { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.16355395317078, 39.97186634617687 ], [ -75.16357004642487, 39.97174712489007 ], [ -75.16333937644957, 39.97173890272471 ], [ -75.1633071899414, 39.97184167972083 ], [ -75.1634681224823, 39.97187045725201 ], [ -75.16355395317078, 39.97186634617687 ] ] ] } };
