"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    Backbone = require('backbone'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    mocks = require('./mocks'),
    utils = require('../core/utils'),
    models = require('./models'),
    views = require('./views'),
    App = require('../app.js'),
    modificationConfigUtils = require('./modificationConfigUtils');

describe('Modeling', function() {
    before(function() {
        if ($('#sandbox').length === 0) {
            $('<div>', {id: 'sandbox'}).appendTo('body');
        }

        // ScenarioModel.initialize() expects
        // App.currProject to be set, and uses it to determine the
        // taskModel and modelPackage to use.
        App.currProject = new models.ProjectModel();
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

            function checkMenuItemsMatch(expectedItems) {
                var $menuItems = $('#sandbox ul.nav.nav-tabs li.active ul.dropdown-menu li'),
                    menuItems = $menuItems.map(function() {
                        return $(this).text();
                    }).get();
                assert.deepEqual(menuItems, expectedItems);
            }

            it('renders tab dropdowns for editing if the user owns the project', function() {
                App.user.set('id', 1);
                var project = getTestProject();

                project.get('scenarios').invoke('set', 'user_id', 1);

                var view = new views.ScenarioTabPanelsView({ collection: project.get('scenarios') });

                $('#sandbox').html(view.render().el);
                checkMenuItemsMatch(['Print', 'Rename', 'Duplicate', 'Delete']);
            });

            it('renders appropriate tab dropdowns if the user does not own the project', function() {
                App.user.set('id', 8);
                var project = getTestProject();

                project.get('scenarios').invoke('set', 'user_id', 1);

                var view = new views.ScenarioTabPanelsView({ collection: project.get('scenarios') });

                $('#sandbox').html(view.render().el);
                checkMenuItemsMatch(['Print']);
            });

            it('renders tab dropdown for sharing if the scenario is saved', function() {
                App.user.set('id', 1);
                var project = getTestProject();

                // Simulate scenario that has been saved.
                project.get('scenarios').invoke('set', 'id', 1);

                var view = new views.ScenarioTabPanelsView({ collection: project.get('scenarios') });

                $('#sandbox').html(view.render().el);
                checkMenuItemsMatch(['Share', 'Print', 'Rename', 'Duplicate', 'Delete']);
            });
        });

        describe('ToolbarTabContentView', function() {
            beforeEach(function() {
                this.model = new models.ScenarioModel({
                    name: 'New Scenario',
                    modifications: []
                });
                this.view = new views.ToolbarTabContentView({
                    model: this.model,
                    collection: models.getControlsForModelPackage('tr-55')
                });
                this.modsModel1 = new models.ModificationModel(mocks.modifications.sample1);
                this.modsModel2 = new models.ModificationModel(mocks.modifications.sample2);
                $('#sandbox').html(this.view.render().el);
            });

            afterEach(function() {
                this.view.remove();
            });

            it('updates the modification count when there is a change to a scenario\'s modifications', function() {
                assert.equal($('#sandbox #modification-number').text(), '0');
                this.model.get('modifications').add([this.modsModel1, this.modsModel2]);
                assert.equal($('#sandbox #modification-number').text(), '2');
            });

            it('lists all of the modifications and their area', function() {
                this.model.get('modifications').add([this.modsModel1, this.modsModel2]);
                assert.equal($('#sandbox #mod-landcover tr td:first-child').text(), 'Low Intensity Residential');
                assert.equal($('#sandbox #mod-landcover tr td:nth-child(2)').text(), '44.4 km2');
                assert.equal($('#sandbox #mod-conservationpractice tr td:first-child').text(), 'Rain Garden');
                assert.equal($('#sandbox #mod-conservationpractice tr td:nth-child(2)').text(), '106.4 km2');
            });

            it('ensures each modification has a pattern', function() {
                $('.inline.controls .thumb').each(function() {
                    var pattern = 'pattern#fill-' + $(this).data('value');
                    assert.isDefined($(pattern));
                });
            });

            it('ensures each modification has draw options', function() {
                var unknownDrawOpts = modificationConfigUtils.getDrawOpts('');

                $('.inline.controls .thumb').each(function() {
                    var thisDrawOpts = modificationConfigUtils.getDrawOpts($(this).data('value'));
                    assert.notEqual(thisDrawOpts, unknownDrawOpts);
                });
            });
        });

        describe('ProjectMenuView', function() {
            it('displays a limited list of options in the drop down menu until the project is saved', function() {
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    preSaveMenuItems = [
                        'Rename',
                        'Save',
                        'Print'
                    ];

                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox li').length, 3);
                $('#sandbox li').each(function() {
                    assert.include(preSaveMenuItems, $(this).text());
                });
            });

            it('displays all the options in the drop down menu if the project is saved', function() {
                // Let the application know which user we are.
                App.user.set('id', 1);
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}',
                    postSaveMenuItems = [
                        'Share',
                        'Make Public',
                        'Delete',
                        'Add Tags',
                        'Rename',
                        'Print'
                    ];

                this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox li').length, 6);
                $('#sandbox li').each(function() {
                    assert.include(postSaveMenuItems, $(this).text());
                });
            });

            it('displays limited options in the user does not own the project', function() {
                // Let the application know which user we are.
                App.user.set('id', 8);
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}';

                this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $('#sandbox').html(view.render().el);
                // Print is the only option for non project owners.
                assert.equal($('#sandbox li').length, 1);
            });

            it('changes the privacy menu item depending on the is_private attribute of the project', function() {
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project });

                project.set({
                    id: 1,
                    is_private: true
                });

                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox #project-privacy').text(), 'Make Public');

                project.set('is_private', false);
                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox #project-privacy').text(), 'Make Private');
            });
        });
    });

    describe('Models', function() {
        describe('ProjectModel', function() {
            describe('#saveProjectAndScenarios', function() {
                it('calls #save on the project and sets the id on every scenario that\'s part of the project', function() {
                    // Let the application know which user we are.
                    App.user.set('id', 1);

                    var projectResponse = '{"id":57,"user":{"id":1,"username":"test","email":"test@azavea.com"},"name":"My Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}';
                    this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                    var project = getTestProject(),
                        projectSpy = sinon.spy(project, 'save'),
                        scenario1Spy = sinon.spy(project.get('scenarios').at(0), 'save'),
                        scenario2Spy = sinon.spy(project.get('scenarios').at(1), 'save');

                    project.saveProjectAndScenarios();

                    assert.isTrue(projectSpy.calledOnce, 'Project was not saved once.');
                    assert.isTrue(scenario1Spy.calledOnce, 'Scenario1 was not saved once.');
                    assert.isTrue(scenario2Spy.calledOnce, 'Scenario2 was not saved once.');
                });

                it('properly associates scenarios with the project when initially saving the project', function() {
                    var projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}',
                        scenarioResponse = '{"id":32,"name":"Current Conditions","is_current_conditions":true,"modifications":"[]","modification_hash":null,"results":null,"created_at":"2015-06-03T20:09:12.161075Z","modified_at":"2015-06-03T20:09:12.161117Z","project":21}';

                    this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);
                    this.server.respondWith('POST', '/api/modeling/scenarios/',
                            [ 200, { 'Content-Type': 'application/json' }, scenarioResponse ]);

                    var project = getTestProject(),
                        scenario1Spy = sinon.spy(project.get('scenarios').at(0), 'save'),
                        scenario2Spy = sinon.spy(project.get('scenarios').at(1), 'save');

                    project.saveProjectAndScenarios();

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
                            .done(function() {
                                var scenarios = project.get('scenarios');

                                assert.isTrue(scenarios instanceof Backbone.Collection);
                                assert.equal(scenarios.length, 3);
                                done();
                            });
                });
            });

            describe('#getReferenceUrl', function() {
                var base = '/project/';

                it('generates no url fragment for unsaved projects', function() {
                    var project = new models.ProjectModel({ id: null });
                    assert.equal(project.getReferenceUrl(), base);
                });

                it('generates a project id fragment when a project is saved and no active scenario is set', function() {
                    var project = new models.ProjectModel({ id: 42 });

                    assert.equal(project.getReferenceUrl(), base + project.id);
                });

                it('generates a project & scenario id fragment when a project is saved and an active scenario is set', function() {
                    var project = new models.ProjectModel({ id: 42 }),
                        scenario = new models.ScenarioModel({ id: 23 }),
                        coll = new models.ScenariosCollection([ scenario ]);

                    project.set('scenarios', coll);

                    coll.setActiveScenario(scenario);

                    assert.equal(project.getReferenceUrl(), base + project.id +
                                 '/scenario/' + scenario.id);
                });
            });
        });

        describe('ModificationModel', function() {
            it('inherits defaults from coreModels.GeoModel', function() {
                var model = new models.ModificationModel({});

                assert.equal(model.get('units'), 'm<sup>2</sup>');
                assert.equal(model.get('area'), 0);
            });
        });

        describe('ModificationCollection', function() {
            it('sorts modifications correctly', function() {
                var collection = new models.ModificationsCollection();

                collection.add(mocks.modifications.sample1);
                collection.add(mocks.modifications.sample2);
                collection.add(mocks.modifications.sample3);

                var collectionOrder = collection.pluck('area'),
                    knownOrder = [
                        (new models.ModificationModel(mocks.modifications.sample2)).get('area'),
                        (new models.ModificationModel(mocks.modifications.sample1)).get('area'),
                        (new models.ModificationModel(mocks.modifications.sample3)).get('area')
                    ];

                assert.deepEqual(collectionOrder, knownOrder,
                    'Collection was not sorted correctly'
                );
            });
        });

        describe('ScenarioModel', function() {
            // TODO: Add tests for existing methods.

            describe('#getCollectionHash', function() {
                it('generates the same hash when given two collections in different order', function() {
                    var modificationsOne = new models.ModificationsCollection(),
                        modificationsTwo = new models.ModificationsCollection();

                    modificationsOne.add(new models.ModificationModel(mocks.modifications.sample1));
                    modificationsOne.add(new models.ModificationModel(mocks.modifications.sample2));

                    modificationsTwo.add(new models.ModificationModel(mocks.modifications.sample2));
                    modificationsTwo.add(new models.ModificationModel(mocks.modifications.sample1OutOfOrder));

                    var hashOne = utils.getCollectionHash(modificationsOne),
                        hashTwo = utils.getCollectionHash(modificationsTwo);

                    assert.equal(hashOne, hashTwo);
                });
            });

            describe('#updateModificationHash', function() {
                it('initializes modification and inputmod hashes', function() {
                    var model = getTestScenarioModel(),
                        modification_hash = utils.getCollectionHash(model.get('modifications')),
                        inputmod_hash = utils.getCollectionHash(model.get('inputs')) + modification_hash;

                    assert.equal(model.get('modification_hash'), modification_hash);
                    assert.equal(model.get('inputmod_hash'), inputmod_hash);
                });

                it('generates and sets modification_hash based on the scenario\'s modifications', function() {
                    var model = new models.ScenarioModel({
                            modifications: [mocks.modifications.sample1]
                        });

                    model.updateModificationHash();
                    assert.equal(model.get('modification_hash'), '40c4fdd89b06a0e9b7e1c3c5c2bd1f17');

                    var mod = new models.ModificationModel(mocks.modifications.sample2);
                    model.get('modifications').add(mod);
                    assert.equal(model.get('modification_hash'), 'dcda6a697d33a3bc95c95cc401e774bb');

                    model.get('modifications').remove(mod);
                    assert.equal(model.get('modification_hash'), '40c4fdd89b06a0e9b7e1c3c5c2bd1f17');
                });

                it('is called when the modifications for a scenario changes', function() {
                    var spy = sinon.spy(models.ScenarioModel.prototype, 'updateModificationHash'),
                        model = new models.ScenarioModel({});

                    model.get('modifications').add(new models.ModificationModel(modificationsSample1));
                    assert.isTrue(spy.calledOnce);

                    models.ScenarioModel.prototype.updateModificationHash.restore();
                });

                it('is called before model#attemptSave when the modifications change', function() {
                    var modSpy = sinon.spy(models.ScenarioModel.prototype, 'updateModificationHash'),
                        saveSpy = sinon.spy(models.ScenarioModel.prototype, 'attemptSave'),
                        model = new models.ScenarioModel({});

                    model.addModification(new models.ModificationModel(modificationsSample1));
                    assert.isTrue(modSpy.calledBefore(saveSpy));

                    models.ScenarioModel.prototype.updateModificationHash.restore();
                    models.ScenarioModel.prototype.attemptSave.restore();
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

                    collection.setActiveScenario(collection.at(2));

                    assert.isTrue(collection.at(2).get('active'));
                });

                it('sets every scenario but the provided scenario to inactive', function() {
                    var collection = getTestScenarioCollection();

                    collection.first().set('active', true);
                    collection.setActiveScenario(collection.at(2));

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
                    assert.equal(collection.length, 4, 'Collection length did not update after duplication.');
                    assert.deepEqual(collection.at(1).get('modifications').attributes, collection.at(3).get('modifications').attributes, 'Modifications did not match.');
                    assert.equal(collection.at(3).get('name'), 'Copy of ' + collection.at(1).get('name'), 'Names did not match.');
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

// var lessThanOneAcrePolygon = { "type": "Feature", "properties": {}, "geometry": { "type": "Polygon", "coordinates": [ [ [ -75.17049014568327, 39.95056149048882 ], [ -75.17032116651535, 39.950538872524845 ], [ -75.17038553953171, 39.9502037145458 ], [ -75.17057061195372, 39.95022633262059 ], [ -75.17049014568327, 39.95056149048882 ] ] ] } };

function getTestScenarioModel() {
    return new models.ScenarioModel(mocks.scenarios.sample);
}

function getTestScenarioCollection() {
    var collection = new models.ScenariosCollection([
            new models.ScenarioModel({
                name: 'Current Conditions',
                is_current_conditions: true
            }),
            new models.ScenarioModel({
                name: 'New Scenario 1',
                modifications: [
                    {
                        name: 'Mod 1',
                        shape: _.cloneDeep(mocks.polygons.greaterThanOneAcre)
                    }
                ],
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
            user_id: 1,
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
