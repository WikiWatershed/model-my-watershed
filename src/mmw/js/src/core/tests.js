"use strict";

var $ = require('jquery'),
    assert = require('chai').assert,
    _ = require('lodash'),
    $ = require('jquery'),
    Marionette = require('../../shim/backbone.marionette'),
    Backbone = require('../../shim/backbone'),
    TransitionRegion = require('../../shim/marionette.transition-region'),
    App = require('../app');

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
        it('adds layers to the map when the model attribute areaOfInterest is set', function() {
            var mapView = App._mapView,
                featureGroup = mapView._areaOfInterestLayer;
            assert.equal(featureGroup.getLayers().length, 0);
            App.map.set('areaOfInterest', TEST_SHAPE);
            assert.equal(featureGroup.getLayers().length, 1);
            App.map.set('areaOfInterest', null);
            assert.equal(featureGroup.getLayers().length, 0);
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
