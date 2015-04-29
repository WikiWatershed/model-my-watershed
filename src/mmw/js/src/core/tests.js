"use strict";

var $ = require('jquery'),
    assert = require('chai').assert,
    _ = require('lodash'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('../../shim/backbone'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    App = require('../app'),
    views = require('./views'),
    models = require('./models');

var TEST_SHAPE = {
    'type': 'Feature',
    'geometry': {
        'type': 'Polygon',
        'coordinates': [[[-5e6, -1e6], [-4e6, 1e6], [-3e6, -1e6]]]
    }
};

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
