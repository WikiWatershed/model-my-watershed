"use strict";

require('../core/testInit.js');

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
    chart = require('./chart'),
    sandboxTemplate = require('./templates/sandbox.html');

var TEST_SHAPE = {
    'type': 'Feature',
    'geometry': {
        'type': 'Polygon',
        'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
    }
};

var chartData = [{x: 'a', y: 1},
                {x: 'b', y: 2},
                {x: 'c', y: 3}],
    xValue = 'x',
    yValue = 'y',
    sandboxHeight = '500',
    sandboxWidth = '700',
    sandboxSelector = '#display-sandbox';

var SandboxRegion = Marionette.Region.extend({
    el: '#display-sandbox'
});

describe('Core', function() {
    beforeEach(function() {
        $('#display-sandbox').remove();
        // Use a special sandbox so that we can test responsiveness of chart.
        $('body').append(sandboxTemplate({height: sandboxHeight, width: sandboxWidth}));
    });

    afterEach(function() {
        $('#display-sandbox').remove();
    });

    describe('Chart', function() {
        beforeEach(function() {
        });

        afterEach(function() {
            $('#display-sandbox').empty();
        });

        it('changes size when the browser is resized and height and width are not provided', function() {
            chart.makeBarChart(sandboxSelector, chartData, xValue, yValue);
            var $svg = $(sandboxSelector).children('svg');

            var beforeHeight = $svg.attr('height');
            var beforeWidth = $svg.attr('width');
            assert.equal(sandboxHeight, beforeHeight);
            assert.equal(sandboxWidth, beforeWidth);

            var afterSandboxHeight = 300;
            var afterSandboxWidth = 400;
            $(sandboxSelector).css('height', afterSandboxHeight);
            $(sandboxSelector).css('width', afterSandboxWidth);
            $(window).trigger('resize');
            var afterHeight = $svg.attr('height');
            var afterWidth = $svg.attr('width');
            assert.equal(afterSandboxHeight, afterHeight);
            assert.equal(afterSandboxWidth, afterWidth);
        });

        it('stays the same size when the browser is resized and height and width are provided', function() {
            var options = {
                height: 400,
                width: 600
            };
            chart.makeBarChart(sandboxSelector, chartData, xValue, yValue, options);
            var $svg = $(sandboxSelector).children('svg');

            var beforeHeight = $svg.attr('height');
            var beforeWidth = $svg.attr('width');
            assert.equal(options.height, beforeHeight);
            assert.equal(options.width, beforeWidth);

            var afterSandboxHeight = 300;
            var afterSandboxWidth = 400;
            $(sandboxSelector).css('height', afterSandboxHeight);
            $(sandboxSelector).css('width', afterSandboxWidth);
            $(window).trigger('resize');
            var afterHeight = $svg.attr('height');
            var afterWidth = $svg.attr('width');
            assert.equal(options.height, afterHeight);
            assert.equal(options.width, afterWidth);
        });
    });
});

describe('Core', function() {
    before(function() {
        if ($('#sandbox').length === 0) {
            $('<div>', {id: 'sandbox'}).appendTo('body');
        }
    });

    beforeEach(function() {
    });

    afterEach(function() {
        $('#sandbox').empty();
        window.location.hash = '';
        Backbone.history.stop();
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('MapView', function() {
        it('adds layers to the map when the map model attribute areaOfInterest is set', function() {
            var mapView = App._mapView,
                featureGroup = mapView._areaOfInterestLayer;

            assert.equal(featureGroup.getLayers().length, 0);
            App.map.set('areaOfInterest', TEST_SHAPE);
            assert.equal(featureGroup.getLayers().length, 1);
            App.map.set('areaOfInterest', null);
            assert.equal(featureGroup.getLayers().length, 0);

            App._mapView._leafletMap.remove();
        });

        it('updates the position of the map when the map model location attributes are set', function() {
            var model = new models.MapModel(),
                view = new views.MapView({
                    model: model
                }),
                latLng = [40, -75],
                zoom = 18;

            view._leafletMap.setView([0, 0], 0);

            model.set({ lat: latLng[0], lng: latLng[1], zoom: zoom });

            assert.equal(view._leafletMap.getCenter().lat, latLng[0]);
            assert.equal(view._leafletMap.getCenter().lng, latLng[1]);
            assert.equal(view._leafletMap.getZoom(), zoom);

            view._leafletMap.remove();
        });

        it('silently sets the map model location attributes when the map position is updated', function() {
            var model = new models.MapModel(),
                view = new views.MapView({
                    model: model
                }),
                latLng = [40, -75],
                zoom = 18;

            view._leafletMap.setView(latLng, zoom);

            assert.equal(model.get('lat'), 40);
            assert.equal(model.get('lng'), -75);
            assert.equal(model.get('zoom'), zoom);

            view._leafletMap.remove();
        });

        it('adds the class "half" to the map view when the map model attribute halfSize is set to true', function(){
            var model = new models.MapModel(),
                view = new views.MapView({
                    model: model
                });

            model.set('halfSize', true);
            assert.isTrue($('#map').hasClass('half'));

            view._leafletMap.remove();
            $('#map').removeClass('half');
        });


        it('removes the class "half" to the map view when the map model attribute halfSize is set to false', function(){
            var model = new models.MapModel(),
                view = new views.MapView({
                    model: model
                });

            model.set('halfSize', false);
            assert.isFalse($('#map').hasClass('half'));

            view._leafletMap.remove();
        });
    });

    describe('Regions', function() {
        describe('TransitionRegion', function() {
            it('calls view.animateIn and executes the correct animation when show is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateIn', function() {
                    assert.equal($('.test-subview').height(), 50);
                    done();
                });

                views.testParentView.testRegion.show(views.testSubView);
            });

            it('calls view.animateOut and executes the correct animation when empty is called', function(done) {
                var views = createTransitionRegionWithAnimatedHeightView('50%', '0%');

                views.testSubView.on('animateOut', function() {
                    assert.equal($('.test-subview').height(), 0);
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
});

function createTransitionRegionWithAnimatedHeightView(displayHeight, hiddenHeight) {
    var TestParentView = Marionette.LayoutView.extend({
            el: 'body',
            regions: {
                testRegion: {
                    regionClass: TransitionRegion,
                    selector: '#sandbox'
                }
            }
        }),
        TestSubView = Marionette.ItemView.extend({
            template: false,
            className: 'test-subview',
            transitionInCss: {
                height: hiddenHeight,
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
        testParentView: testParentView,
        testSubView: testSubView
    };
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
