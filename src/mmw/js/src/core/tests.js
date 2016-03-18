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
    views = require('./views'),
    models = require('./models'),
    AppRouter = require('../router').AppRouter,
    settings = require('./settings'),
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

describe('Core', function() {
    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }
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
                    view = new views.MapView({
                        model: model,
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
                    view = new views.MapView({
                        model: model,
                        el: sandboxSelector
                    }),
                    latLng = [40, -75],
                    zoom = 18;

                view._leafletMap.setView([0, 0], 0);

                model.set({ lat: latLng[0], lng: latLng[1], zoom: zoom });

                assert.equal(view._leafletMap.getCenter().lat, latLng[0]);
                assert.equal(view._leafletMap.getCenter().lng, latLng[1]);
                assert.equal(view._leafletMap.getZoom(), zoom);

                view.destroy();
            });

            it('silently sets the map model location attributes when the map position is updated', function() {
                var model = new models.MapModel(),
                    view = new views.MapView({
                        model: model,
                        el: sandboxSelector
                    }),
                    latLng = [40, -75],
                    zoom = 18;

                view._leafletMap.setView(latLng, zoom);

                assert.equal(model.get('lat'), 40);
                assert.equal(model.get('lng'), -75);
                assert.equal(model.get('zoom'), zoom);

                view.destroy();
            });

            it('adds the map-container top & bottom classes to the map container for DoubleHeader and Small Footer', function(){
                var model = new models.MapModel(),
                    view = new views.MapView({
                        model: model,
                        el: sandboxSelector
                    }),
                    $container = $(sandboxSelector).parent();

                model.setDoubleHeaderSmallFooterSize();
                assert.isTrue($container.hasClass('map-container-top-2'));
                assert.isTrue($container.hasClass('map-container-bottom-2'));

                view.destroy();
            });

            it('adds the map-container top & bottom classes to the map container for Draw screen with AoI bar', function(){
                var model = new models.MapModel(),
                    view = new views.MapView({
                        model: model,
                        el: sandboxSelector
                    }),
                    $container = $(sandboxSelector).parent();

                model.setDrawWithBarSize();
                assert.isTrue($container.hasClass('map-container-top-1'));
                assert.isTrue($container.hasClass('map-container-bottom-3'));

                view.destroy();
            });


            it('creates a layer selector with the correct items', function() {
                var baseLayers = [
                    {
                        'url': 'https://{s}.tiles.mapbox.com/v3/ctaylor.lg2deoc9/{z}/{x}/{y}.png',
                        'default': true,
                        'display': 'A',
                        'basemap': true
                    },
                    {
                        'url': 'https://{s}.tiles.mapbox.com/v3/examples.map-i86nkdio/{z}/{x}/{y}.png',
                        'display': 'B',
                        'basemap': true
                    }
                ];
                settings.set('base_layers', baseLayers);

                var model = new models.MapModel(),
                    view = new views.MapView({
                        model: model,
                        el: sandboxSelector
                    }),
                    $layers = $('.leaflet-control-layers-base'),
                    layerNames = $layers.find('span').map(function() {
                        return $(this).text().trim();
                    }).get();

                assert.equal($layers.length, 2, 'Did not add layer selector');
                assert.deepEqual(layerNames, _.pluck(baseLayers, 'display'));

                view.destroy();
            });
        });

        describe('ModificationPopupView', function() {
            it('deletes the modification it is associated with when the delete button is clicked', function() {
                var model = new Backbone.Model({
                        value: 'developed_low',
                        shape: {},
                        area: 100,
                        units: 'm<sup>2</sup>',
                    }),
                    view = new views.ModificationPopupView({ model: model });

                var spy = sinon.spy(model, 'destroy');

                $(sandboxSelector).html(view.render().el);
                $(sandboxSelector + ' .delete-modification').click();
                assert.equal(spy.callCount, 1);

                view.destroy();
            });
        });

        describe('HeaderView', function() {
            it('shows the current page', function() {
                var appState = new models.AppStateModel({
                        current_page_title: 'Test Page'
                    }),
                    header = new views.HeaderView({
                        model: App.user,
                        appState: appState
                    }).render();

                assert.include(header.$el.find('.brand').text(), 'Test Page');
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
                    assert.equal(model.get('units'), 'm<sup>2</sup>');
                });

                it('calculates and sets the area attribute to sq. km. if the area is greater than 1,000 sq. m.', function() {
                    var model = new models.GeoModel({
                        shape: polygon7Km
                    });

                    assert.equal(Math.round(model.get('area')), 7);
                    assert.equal(model.get('units'), 'km<sup>2</sup>');
                });

                it('sets the provided fields instead of the defaults if arguments are passed', function() {
                    var model = new models.GeoModel({
                        effectiveShape: polygon7Km,
                        effectiveArea: 0,
                        effectiveUnits: ''
                    });

                    model.setDisplayArea('effectiveShape', 'effectiveArea', 'effectiveUnits');
                    assert.equal(Math.round(model.get('effectiveArea')), 7);
                    assert.equal(model.get('effectiveUnits'), 'km<sup>2</sup>');
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
                    taskType: 'modeling',
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
                this.server.respondWith('POST', '/api/modeling/start/tr55/',
                                        [ 200,
                                          { 'Content-Type': 'application/json' },
                                          JSON.stringify(this.startResponse) ]);
                this.server.respondWith('GET', '/api/modeling/jobs/1/',
                                        [ 200,
                                          { 'Content-Type': 'application/json' },
                                          JSON.stringify(this.pollingResponse) ]);
            });

            describe('#pollForResults', function() {
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
                    self.server.respondWith('GET', '/api/modeling/jobs/1/',
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
                    self.server.respondWith('GET', '/api/modeling/jobs/1/',
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
                    self.server.respondWith('GET', '/api/modeling/jobs/1/',
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
            });

            describe('#start', function() {
                it('calls onStart and startFailure if initial fetch fails', function(done) {
                    var self = this;
                    self.server.respondWith('POST', '/api/modeling/start/tr55/',
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
                    self.server.respondWith('GET', '/api/modeling/jobs/1/',
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
    });

    describe('Regions', function() {
        describe('TransitionRegion', function() {
            it('calls view.animateIn and executes the correct animation when show is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateIn', function() {
                    assert.equal($('.test-subview').height(), 50);
                    views.destroy();
                    done();
                });

                views.testParentView.testRegion.show(views.testSubView);
            });

            it('calls view.animateOut and executes the correct animation when empty is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateOut', function() {
                    assert.equal($('.test-subview').height(), 0);
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

            _.each(requestMethods, function(method) {
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

            _.each(requestMethods, function(method) {
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

            _.each(requestMethods, function(method) {
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

            _.each(requestMethods, function(method) {
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
