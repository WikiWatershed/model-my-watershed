"use strict";

require('../core/testInit.js');

var _ = require('lodash'),
    $ = require('jquery'),
    Backbone = require('backbone'),
    assert = require('chai').assert,
    Marionette = require('../../shim/backbone.marionette'),
    sinon = require('sinon'),
    models = require('./models'),
    views = require('./views');

describe('Modeling', function() {
    before(function() {
        if ($('#sandbox').length === 0) {
            $('<div>', {id: 'sandbox'}).appendTo('body');
        }
    });

    beforeEach(function() {
        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;
    });

    afterEach(function() {
        $('#sandbox').empty();
    });

    after(function() {
        $('#sandbox').remove();
    });

    describe('Views', function() {
        describe('ScenariosView', function() {
            it('adds a new scenario when the plus button is clicked', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenariosView({ collection: collection });

                $('#sandbox').html(view.render().el);

                assert.equal(collection.length, 3);
                $('#sandbox #add-scenario').click();
                assert.equal(collection.length, 4);
            });
        });

        describe('ScenarioDropDownMenuView', function() {
            it('sets the selected scenario to active', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $('#sandbox').html(view.render().el);
                $('#sandbox .dropdown-menu li:nth-child(2) a').click();

                assert.isTrue(collection.at(1).get('active'));
            });
        });

        describe('ScenarioTabPanelsView', function() {
            it('renders no tabs if there are no scenarios', function() {
                var collection = new models.ScenariosCollection([]),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $('#sandbox').html(view.render().el);
                assert.equal($('#sandbox ul.nav.nav-tabs > li').length, 0);
            });

            it('renders one tab if there is one scenario', function() {
                var collection = new models.ScenariosCollection([
                        new models.ScenarioModel({ name: 'Current Conditions' })
                    ]),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $('#sandbox').html(view.render().el);
                assert.equal($('#sandbox ul.nav.nav-tabs > li').length, 1);
            });

            it('renders multiple tabs if there are multiple scenarios', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $('#sandbox').html(view.render().el);
                assert.equal($('#sandbox ul.nav.nav-tabs > li').length, 3);
            });
        });

        describe('ToolbarTabContentView', function() {
            it('updates the modification count when there is a change to a scenario\'s modifications', function() {
                var modsCollection = new models.ModificationsCollection(),
                    model = new models.ScenarioModel({ name: 'New Scenario', modifications: modsCollection }),
                    view = new views.ToolbarTabContentView({
                        model: model,
                        collection: getTR55ModelPackage().get('controls')
                    }),
                    modsModel1 = new models.ModificationModel(modificationsSample1),
                    modsModel2 = new models.ModificationModel(modificationsSample2);

                $('#sandbox').html(view.render().el);
                assert.equal($('#sandbox #modification-number').text(), '0');

                model.get('modifications').add([modsModel1, modsModel2]);
                assert.equal($('#sandbox #modification-number').text(), '2');
            });

            it('lists all of the modifications and their area', function() {
                var modsModel1 = new models.ModificationModel(modificationsSample1),
                    modsModel2 = new models.ModificationModel(modificationsSample2),
                    modsCollection = new models.ModificationsCollection([ modsModel1, modsModel2 ]),
                    model = new models.ScenarioModel({ name: 'New Scenario', modifications: modsCollection }),
                    view = new views.ToolbarTabContentView({
                        model: model,
                        collection: getTR55ModelPackage().get('controls')
                    });

                $('#sandbox').html(view.render().el);
                assert.equal($('#sandbox #mod-landcover tr td:first-child').text(), 'LIR');
                assert.equal($('#sandbox #mod-landcover tr td:nth-child(2)').text(), '44.4 km2');
                assert.equal($('#sandbox #mod-conservationpractice tr td:first-child').text(), 'Rain Garden');
                assert.equal($('#sandbox #mod-conservationpractice tr td:nth-child(2)').text(), '106.4 km2');
            });
        });
    });

    describe('Models', function() {
        describe('ProjectModel', function() {
            describe('#saveAll', function() {
                it('calls #save on the project and on every scenario that\'s part of the project', function() {
                    this.server.respondWith([200, { 'Content-Type': 'application/json' }, '[]']);

                    var project = getTestProject(),
                        projectSpy = sinon.spy(project, 'save'),
                        scenario1Spy = sinon.spy(project.get('scenarios').at(0), 'save'),
                        scenario2Spy = sinon.spy(project.get('scenarios').at(1), 'save');

                    project.saveAll();

                    assert.isTrue(projectSpy.calledOnce);
                    assert.isTrue(scenario1Spy.calledOnce);
                    assert.isTrue(scenario1Spy.calledOnce);
                });

                it('properly associates scenarios with the project when initially saving the project', function() {
                    var projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}',
                        scenarioResponse = '{"id":32,"name":"Current Conditions","is_current_conditions":true,"modifications":"[]","modification_hash":null,"results":null,"created_at":"2015-06-03T20:09:12.161075Z","modified_at":"2015-06-03T20:09:12.161117Z","project":21}';

                    this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);
                    this.server.respondWith('POST', '/api/modeling/scenarios/',
                            [ 200, { 'Content-Type': 'application/json' }, scenarioResponse ]);

                    var project = getTestProject(),
                        projectSpy = sinon.spy(project, 'save'),
                        scenario1Spy = sinon.spy(project.get('scenarios').at(0), 'save'),
                        scenario2Spy = sinon.spy(project.get('scenarios').at(1), 'save');

                    project.saveAll();

                    // spy.thisValues[0] == `this` when function being spied on
                    // was first called.
                    assert.equal(scenario1Spy.thisValues[0].get('project'), 21);
                    assert.equal(scenario2Spy.thisValues[0].get('project'), 21);
                });
            });

            describe('#parse', function() {
                it('correctly constructs the nested project model from the server response', function(done) {
                    var projectResponse = '{"id":22,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[{"id":28,"name":"Current Conditions","is_current_conditions":true,"modifications":"[]","modification_hash":null,"results":null,"created_at":"2015-06-01T20:23:37.689469Z","modified_at":"2015-06-03T19:09:17.795635Z","project":22},{"id":30,"name":"New Scenario 1","is_current_conditions":false,"modifications":"[]","modification_hash":null,"results":null,"created_at":"2015-06-03T15:46:46.794796Z","modified_at":"2015-06-03T19:09:17.902091Z","project":22},{"id":31,"name":"New Scenario","is_current_conditions":false,"modifications":"[]","modification_hash":null,"results":null,"created_at":"2015-06-03T19:09:17.983346Z","modified_at":"2015-06-03T19:09:17.983386Z","project":22}],"name":"real deal","area_of_interest":{"type":"MultiPolygon","coordinates":[[[[-76.28631591796875,40.32037295438762],[-76.28219604492188,39.97817244470628],[-75.15609741210938,39.9602803542957],[-75.1519775390625,40.31827882257792],[-76.28631591796875,40.32037295438762]]]]},"is_private":true,"model_package":"tr-55","created_at":"2015-06-01T20:23:37.535349Z","modified_at":"2015-06-03T19:09:17.670821Z"}';

                    this.server.respondWith('GET', '/api/modeling/projects/22',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                    var project = new models.ProjectModel({ id: 22 });

                    project.fetch()
                            .done(function(data) {
                                var scenarios = project.get('scenarios');

                                assert.isTrue(scenarios instanceof Backbone.Collection);
                                assert.equal(scenarios.length, 3);
                                done();
                            });
                });
            });
        });

        describe('ModificatioModel', function() {
            it('inherits defaults from coreModels.GeoModel', function() {
                var model = new models.ModificationModel({});

                assert.equal(model.get('units'), 'm<sup>2</sup>');
                assert.equal(model.get('area'), 0);
            });
        });

        describe('ScenarioModel', function() {
            describe('#getSlug', function() {
                it('creates a slug with spaces converted to hyphens', function() {
                    var model = new models.ScenarioModel({ name: 'test model name' });

                    assert.equal(model.getSlug(), 'test-model-name');
                });

                it('creates a slug with only alphanumeric characters', function() {
                    var model = new models.ScenarioModel({ name: 'test-model#$%*()(%^%' });

                    assert.equal(model.getSlug(), 'test-model');
                });

                it('creates a slug with only lowercase characters', function() {
                    var model = new models.ScenarioModel({ name: 'TEST_MODEL' });

                    assert.equal(model.getSlug(), 'test_model');
                });
            });
        });

        describe('ScenarioCollection', function() {
            describe('#makeFirstScenarioActive', function() {
                it('sets the first scenario in the collection as the active scenario', function() {
                    var collection = getTestScenarioCollection();

                    assert.isFalse(collection.first().get('active'));

                    collection.makeFirstScenarioActive();

                    assert.isTrue(collection.first().get('active'));
                });
            });

            describe('#setActiveScenario', function() {
                it('sets the provided scenario as the active scenario', function() {
                    var collection = getTestScenarioCollection();

                    assert.isFalse(collection.at(2).get('active'));

                    collection.setActiveScenario(collection.at(2).cid);

                    assert.isTrue(collection.at(2).get('active'));
                });

                it('sets every scenario but the provided scenario to inactive', function() {
                    var collection = getTestScenarioCollection();

                    collection.first().set('active', true);
                    collection.setActiveScenario(collection.at(2).cid);

                    assert.isFalse(collection.at(0).get('active'));
                    assert.isFalse(collection.at(1).get('active'));
                    assert.isTrue(collection.at(2).get('active'));
                });
            });

            describe('#createNewScenario', function() {
                it('adds a new scenario to the collection', function() {
                    var collection = getTestScenarioCollection();

                    assert.equal(collection.length, 3);

                    collection.createNewScenario();

                    assert.equal(collection.length, 4);
                });

                it('sets the new scenario as the active scenario', function() {
                    var collection = getTestScenarioCollection();

                    collection.createNewScenario();

                    assert.equal(collection.at(3).get('active'), true);
                });

                it('give the new scenario a name that contains "New Scenario"', function() {
                    var collection = getTestScenarioCollection();

                    collection.createNewScenario();

                    assert.isTrue(_.contains(collection.at(3).get('name'), 'New Scenario'));
                });
            });

            describe('#updateScenarioName', function() {
                it('trims whitespace from the provided new name', function() {
                    var collection = getTestScenarioCollection();

                    collection.updateScenarioName(collection.at(0), 'New Name       ');

                    assert.equal(collection.at(0).get('name'), 'New Name');
                });

                it('ignores case when comparing the new name with existing names', function() {
                    var collection = getTestScenarioCollection();

                    // There's already a scenario with the name "New Scenario 1"
                    collection.updateScenarioName(collection.at(0), 'NEW scenArio 1');

                    assert.equal(collection.at(0).get('name'), 'Current Conditions');
                });

                it('will not rename the scenario if the new name matches an existing name', function() {
                    var collection = getTestScenarioCollection();

                    // There's already a scenario with the name "Current Conditions"
                    collection.updateScenarioName(collection.at(1), 'Current Conditions');

                    assert.equal(collection.at(1).get('name'), 'New Scenario 1');
                });
            });

            describe('#duplicateScenario', function() {
                it('duplicates an existing scenario and add the new scenario to the collection', function() {
                    var collection = getTestScenarioCollection(),
                        scenario = collection.at(1);

                    assert.equal(collection.length, 3);

                    collection.duplicateScenario(scenario.cid);
                    assert.equal(collection.length, 4);
                    assert.deepEqual(collection.at(1).get('modifications'), collection.at(3).get('modifications'));
                    assert.equal(collection.at(3).get('name'), 'Copy of ' + collection.at(1).get('name'));
                });
            });

            describe('#makeScenarioName', function() {
                it('creates a new unique scenario name based off baseName', function() {
                    var collection = getTestScenarioCollection();

                    var newName = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName, 'Copy of ' + collection.at(0).get('name'));

                    collection.add({ name: newName });
                    var newName2 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName2, 'Copy of ' + collection.at(0).get('name') + ' 1');

                    collection.add({ name: newName2 });
                    var newName3 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName3, 'Copy of ' + collection.at(0).get('name') + ' 2');
                });

                it('doesn\'t append a number to the first duplicate of baseName if it doesn\'t take a number to make the name unique', function() {
                    var collection = getTestScenarioCollection();

                    var newName = collection.makeNewScenarioName('Copy of ' + collection.at(2).get('name'));
                    assert.equal(newName, 'Copy of Flood Scenario');
                });

                it('correctly generates unique names for baseNames with trailing numbers', function() {
                    var collection = getTestScenarioCollection();

                    collection.at(0).set('name', 'Foo Bar 1');

                    var newName = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName, 'Copy of ' + collection.at(0).get('name'));

                    collection.add({ name: newName });
                    var newName2 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName2, 'Copy of ' + collection.at(0).get('name') + ' 1');

                    collection.add({ name: newName2 });
                    var newName3 = collection.makeNewScenarioName('Copy of ' + collection.at(0).get('name'));
                    assert.equal(newName3, 'Copy of ' + collection.at(0).get('name') + ' 2');
                });
            });
        });
    });
});

var lessThanOneAcrePolygon = { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17049014568327, 39.95056149048882 ], [ -75.17032116651535, 39.950538872524845 ], [ -75.17038553953171, 39.9502037145458 ], [ -75.17057061195372, 39.95022633262059 ], [ -75.17049014568327, 39.95056149048882 ] ] ] } };

var greaterThanOneAcrePolygon = { "type": "FeatureCollection", "features": [ { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17273247241974, 39.950349703806005 ], [ -75.1707261800766, 39.95009473644421 ], [ -75.17104804515839, 39.94857313726802 ], [ -75.17302215099335, 39.94882399784062 ], [ -75.17273247241974, 39.950349703806005 ] ] ] } } ] };

var modificationsSample1 = {
    "name":"Land Cover",
    "value":"LIR",
    "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-76.00479125976562,40.19251207621169],[-76.04324340820312,40.13794057716276],[-75.95260620117188,40.136890695345905],[-75.93338012695312,40.182020964319086],[-75.96221923828125,40.199854889057676],[-76.00479125976562,40.19251207621169]]]}},
    "area":10977.041602204828,
    "units":"acres"
};

var modificationsSample2  = {
    "name":"Conservation Practice",
    "value":"Rain Garden",
    "shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.53237915039062,40.18307014852534],[-75.66009521484375,40.107487419012415],[-75.50491333007812,40.10118506258701],[-75.43350219726561,40.13899044275822],[-75.42800903320312,40.1673306817866],[-75.53237915039062,40.18307014852534]]]}},
    "area":26292.18855342856,
    "units":"acres"
};

function getTestScenarioCollection() {
    var collection = new models.ScenariosCollection([
            new models.ScenarioModel({
                name: 'Current Conditions',
                is_current_conditions: true
            }),
            new models.ScenarioModel({
                name: 'New Scenario 1',
                modifications: new models.ModificationsCollection([
                    new models.ModificationModel({
                        name: 'Mod 1',
                        shape: _.cloneDeep(greaterThanOneAcrePolygon)
                    })
                ]),
                active: true
            }),
            new models.ScenarioModel({
                name: 'Flood Scenario'
            })
        ]);

    return collection;
}

function getTestProject() {
    var project = new models.ProjectModel({
            name: 'My Project',
            created_at: Date.now(),
            area_of_interest: '[]',
            scenarios: new models.ScenariosCollection([
                new models.ScenarioModel({
                    name: 'Current Conditions',
                    is_current_conditions: true
                }),
                new models.ScenarioModel({
                    name: 'New Scenario',
                    is_current_conditions: false,
                    active: true
                })
            ])
        });

    return project;
}

function getTR55ModelPackage() {
    return new models.ModelPackageModel({
        name: 'tr-55',
        controls: new models.ModelPackageControlsCollection([
            new models.ModelPackageControlModel({ name: 'landcover' }),
            new models.ModelPackageControlModel({ name: 'conservation_practice' }),
            new models.ModelPackageControlModel({ name: 'precipitation' })
        ])
    });
}
