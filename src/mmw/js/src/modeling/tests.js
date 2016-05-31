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
    testUtils = require('../core/testUtils'),
    modConfigUtils = require('./modificationConfigUtils');

var sandboxId = 'sandbox',
    sandboxSelector = '#' + sandboxId;

describe('Modeling', function() {
    before(function() {
        if ($(sandboxSelector).length === 0) {
            $('<div>', {id: sandboxId}).appendTo('body');
        }
    });

    beforeEach(function() {
        // ScenarioModel.initialize() expects
        // App.currentProject to be set, and uses it to determine the
        // taskModel and modelPackage to use.
        App.currentProject = new models.ProjectModel();

        this.server = sinon.fakeServer.create();
        this.server.respondImmediately = true;

        // Using debounce causes adding modifications to become asynchronous
        // due to using setTimeout, which makes it more difficult to test.
        // Using the fake timer in sinon does not help because lodash has its own
        // cached copy of the setTimeout function. So, we mock debounce.
        this.origDebounce = _.debounce;
        _.debounce = _.identity;
    });

    afterEach(function() {
        $(sandboxSelector).remove();
        $('<div>', {id: sandboxId}).appendTo('body');

        testUtils.resetApp(App);
        _.debounce = this.origDebounce;
    });

    after(function() {
        $(sandboxSelector).remove();
    });

    describe('Views', function() {
        describe('ScenariosView', function() {
            it('adds a new scenario when the plus button is clicked', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenariosView({
                        collection: collection,
                        projectModel: new models.ProjectModel()
                    });

                $(sandboxSelector).html(view.render().el);

                assert.equal(collection.length, 3);
                $('#sandbox #add-scenario').click();
                assert.equal(collection.length, 4);
            });
        });

        describe('ScenarioDropDownMenuView', function() {
            it('sets the selected scenario to active', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                $('#sandbox .dropdown-menu li:nth-child(2) a').click();

                assert.isTrue(collection.at(1).get('active'));
            });
        });

        describe('ScenarioTabPanelsView', function() {
            it('renders no tabs if there are no scenarios', function() {
                var collection = new models.ScenariosCollection([]),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                assert.equal($('#sandbox ul.nav.nav-tabs > li').length, 0);
            });

            it('renders one tab if there is one scenario', function() {
                var collection = new models.ScenariosCollection([
                    new models.ScenarioModel({ name: 'Current Conditions' })
                ]),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                assert.equal($('#sandbox ul.nav.nav-tabs > li').length, 1);
            });

            it('renders multiple tabs if there are multiple scenarios', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioTabPanelsView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
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

                $(sandboxSelector).html(view.render().el);
                checkMenuItemsMatch(['Rename', 'Duplicate', 'Delete']);
            });

            it('renders no tab dropdowns if the user does not own the project', function() {
                App.user.set('id', 8);
                var project = getTestProject();

                project.get('scenarios').invoke('set', 'user_id', 1);

                var view = new views.ScenarioTabPanelsView({ collection: project.get('scenarios') });

                $(sandboxSelector).html(view.render().el);
                assert.isUndefined($(sandboxSelector + ' .scenario-btn-dropdown').el);
            });

            it('renders tab dropdown for sharing if the scenario is saved', function() {
                App.user.set('id', 1);
                var project = getTestProject();

                // Simulate scenario that has been saved.
                project.get('scenarios').invoke('set', 'id', 1);

                var view = new views.ScenarioTabPanelsView({ collection: project.get('scenarios') });

                $(sandboxSelector).html(view.render().el);
                checkMenuItemsMatch(['Share', 'Rename', 'Duplicate', 'Delete']);
            });
        });

        describe('Tr55ToolbarTabContentView', function() {
            beforeEach(function() {
                this.userId = 1;
                App.user.id = this.userId;
                this.model = new models.ScenarioModel({
                    name: 'New Scenario',
                    modifications: []
                });
                this.view = new views.Tr55ToolbarTabContentView({
                    model: this.model,
                    collection: models.getControlsForModelPackage('tr-55')
                });
                this.modsModel1 = new models.ModificationModel(mocks.modifications.sample1);
                this.modsModel2 = new models.ModificationModel(mocks.modifications.sample2);
                $(sandboxSelector).html(this.view.render().el);
            });

            afterEach(function() {
                this.view.remove();
            });

            it('updates the modification count when there is a change to a scenario\'s modifications', function() {
                assert.equal($('#sandbox #modification-number').text(), '0');
                this.model.get('modifications').add([this.modsModel1, this.modsModel2]);
                assert.equal($('#sandbox #modification-number').text(), '2');
            });

            it('lists all of the modifications and their effective area', function() {
                this.model.get('modifications').add([this.modsModel1, this.modsModel2]);
                assert.equal($('#sandbox #mod-landcover tbody tr td:first-child').text(), 'Developed, Low Intensity');
                assert.equal($('#sandbox #mod-landcover tbody tr td:nth-child(2)').text(), '44.42 km2');
                assert.equal($('#sandbox #mod-conservationpractice tbody tr td:first-child').text(), 'Rain Garden');
                assert.equal($('#sandbox #mod-conservationpractice tbody tr td:nth-child(2)').text(), '106.40 km2');
            });

            it('ensures each modification has a pattern', function() {
                $('.inline.controls .thumb').each(function() {
                    var pattern = 'pattern#fill-' + $(this).data('value');
                    assert.isDefined($(pattern));
                });
            });

            it('ensures each modification has draw options', function() {
                var unknownDrawOpts = modConfigUtils.getDrawOpts('');

                $('.inline.controls .thumb').each(function() {
                    var thisDrawOpts = modConfigUtils.getDrawOpts($(this).data('value'));
                    assert.notEqual(thisDrawOpts, unknownDrawOpts);
                });
            });

            it('shows modification and input controls if user owns project', function() {
                this.model.set('user_id', this.userId);
                this.view.render();
                assert.equal($('#sandbox .controls .landcover').length, 1,
                               'Should have shown landcover control');
                assert.equal($('#sandbox .controls .conservation_practice').length, 1,
                               'Should have shown conservation practices control');
                assert.equal($('#sandbox .controls .precipitation').length, 1,
                               'Should have shown precipitation control');
            });

            it('only shows input tools if user does not own project', function() {
                this.model.set('user_id', this.userId + 1);
                this.view.render();

                assert.equal($('#sandbox .controls .landcover').length, 0,
                               'Should not have shown landcover control');
                assert.equal($('#sandbox .controls .conservation_practice').length, 0,
                               'Should not have shown conservation practices control');
                assert.equal($('#sandbox .controls .precipitation').length, 1,
                               'Should have shown precipitation control');
            });
        });

        describe('ProjectMenuView', function() {
            it('displays a limited list of options in the drop down menu until the project is saved', function() {
                // Make user id same as one on project, so it is considered editable.
                App.user.set('id', 1);

                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    preSaveMenuItems = [
                        'Rename',
                        'Save'
                    ];

                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox li').length, preSaveMenuItems.length);
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
                        'Rename',
                        '',
                        'My Projects'
                    ];

                this.server.respondWith('POST', '/api/modeling/projects/',
                                        [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox li').length, postSaveMenuItems.length);
                $('#sandbox li').each(function() {
                    assert.include(postSaveMenuItems, $(this).text());
                });
            });

            it('displays no options if the user does not own the project', function() {
                // Let the application know which user we are.
                App.user.set('id', 8);
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}';

                this.server.respondWith('POST', '/api/modeling/projects/',
                                        [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $(sandboxSelector).html(view.render().el);
                assert.isUndefined($('#project-settings').el);
            });

            it('changes the privacy menu item depending on the is_private attribute of the project', function() {
                // Make user id same as one on project, so it is considered editable.
                App.user.set('id', 1);

                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project });

                // Set id attribute so project.isNew() is false.
                project.set({
                    id: 5,
                    is_private: true
                });

                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox #project-privacy').text(), 'Make Public');

                project.set('is_private', false);
                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox #project-privacy').text(), 'Make Private');
            });

            it('shows "Embed in ITSI" link only for ITSI users', function() {
                App.user.set({
                    id: 1,
                    itsi: true
                });

                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}',
                    postSaveMenuItems = [
                        'Share',
                        'Make Public',
                        'Delete',
                        'Rename',
                        'Embed in ITSI',
                        '',
                        'My Projects'
                    ];

                this.server.respondWith('POST', '/api/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox li').length, postSaveMenuItems.length);
                $('#sandbox li').each(function() {
                    assert.include(postSaveMenuItems, $(this).text());
                });
            });
        });
    });

    describe('modificationConfigUtils', function() {
        beforeEach(function() {
            this.config = {
                key1: {
                    name: 'name1'
                },
                key2: {
                    name: 'name2',
                    shortName: 'shortName2',
                    summary: 'summary2',
                    strokeColor: '#000'
                }
            };
            modConfigUtils.setConfig(this.config);
        });

        afterEach(function() {
            modConfigUtils.resetConfig();
        });

        describe('#getHumanReadableName', function() {
            it('returns the provided name when modKey exists', function() {
                assert.equal(modConfigUtils.getHumanReadableName('key1'), 'name1');
            });

            it('returns the default name when modKey does not exist', function() {
                assert.equal(modConfigUtils.getHumanReadableName('key3'), '');
            });
        });

        describe('#getHumanReadableShortName', function() {
            it('returns the name when the short name is not provided', function() {
                assert.equal(modConfigUtils.getHumanReadableShortName('key1'), 'name1');
            });

            it('returns the provided short name', function() {
                assert.equal(modConfigUtils.getHumanReadableShortName('key2'), 'shortName2');
            });

            it('returns the default short name when modKey does not exist', function() {
                assert.equal(modConfigUtils.getHumanReadableShortName('key3'), '');
            });
        });

        describe('#getHumanReadableSummary', function() {
            it('returns the default summary when one is not provided', function() {
                assert.equal(modConfigUtils.getHumanReadableSummary('key1'), '');
            });

            it('returns the provided summary', function() {
                assert.equal(modConfigUtils.getHumanReadableSummary('key2'), 'summary2');
            });

            it('returns the default summary when modKey does not exist', function() {
                assert.equal(modConfigUtils.getHumanReadableSummary('key3'), '');
            });
        });

        describe('#getDrawOpts', function() {
            it('returns the default colors when one is not provided', function() {
                assert.equal(modConfigUtils.getDrawOpts('key1').color, '#888');
                assert.equal(modConfigUtils.getDrawOpts('key1').fillColor, '#888');
            });

            it('returns the provided colors', function() {
                assert.equal(modConfigUtils.getDrawOpts('key2').color, '#000');
                assert.equal(modConfigUtils.getDrawOpts('key2').fillColor, 'url(#fill-key2)');
            });

            it('returns the default colors when modKey does not exist', function() {
                assert.equal(modConfigUtils.getDrawOpts('key3').color, '#888');
                assert.equal(modConfigUtils.getDrawOpts('key3').fillColor, '#888');
            });
        });
    });

    describe('Models', function() {
        describe('ResultCollection', function() {
            beforeEach(function() {
                this.results = new models.ResultCollection([
                    {
                        polling: false,
                        result: 1
                    },
                ]);
            });

            describe('#setPolling', function() {
                it('sets polling for each result', function() {
                    this.results.setPolling(true);
                    assert(this.results.length === 1);
                    this.results.forEach(function(result) {
                        assert(result.get('polling'), 'Should have set polling to true');
                    });
                });
            });

            describe('#setNullResults', function() {
                it('sets each result to null', function() {
                    this.results.setNullResults();
                    assert(this.results.length === 1);
                    this.results.forEach(function(result) {
                        assert.isNull(result.get('result'), 'Should have set result to null');
                    });
                });
            });
        });

        describe('ProjectModel', function() {
            describe('#saveProjectAndScenarios', function() {
                beforeEach(function() {
                    App.user.set('id', 1);
                });

                it('calls #save on the project and sets the id on every scenario that\'s part of the project', function() {
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
                        scenarioResponse = '{"id":32,"name":"Current Conditions","is_current_conditions":true,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-03T20:09:12.161075Z","modified_at":"2015-06-03T20:09:12.161117Z","project":21}';

                    this.server.respondWith('POST', '/api/modeling/projects/',
                                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);
                    this.server.respondWith('POST', '/api/modeling/scenarios/',
                                            [ 200, { 'Content-Type': 'application/json' }, scenarioResponse ]);

                    var project = getTestProject();

                    project.saveProjectAndScenarios();

                    assert.equal(project.get('scenarios').at(0).get('project'), 21);
                    assert.equal(project.get('scenarios').at(1).get('project'), 21);
                });
            });

            describe('#parse', function() {
                it('correctly constructs the nested project model from the server response', function(done) {
                    var projectResponse = '{"id":22,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[{"id":28,"name":"Current Conditions","is_current_conditions":true,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-01T20:23:37.689469Z","modified_at":"2015-06-03T19:09:17.795635Z","project":22},{"id":30,"name":"New Scenario 1","is_current_conditions":false,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-03T15:46:46.794796Z","modified_at":"2015-06-03T19:09:17.902091Z","project":22},{"id":31,"name":"New Scenario","is_current_conditions":false,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-03T19:09:17.983346Z","modified_at":"2015-06-03T19:09:17.983386Z","project":22}],"name":"real deal","area_of_interest":{"type":"MultiPolygon","coordinates":[[[[-76.28631591796875,40.32037295438762],[-76.28219604492188,39.97817244470628],[-75.15609741210938,39.9602803542957],[-75.1519775390625,40.31827882257792],[-76.28631591796875,40.32037295438762]]]]},"is_private":true,"model_package":"tr-55","created_at":"2015-06-01T20:23:37.535349Z","modified_at":"2015-06-03T19:09:17.670821Z"}';

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

            it('has an effective shape and area, which is equal to the intersection of the shape and the AoI', function() {
                var sqKm = {"type":"MultiPolygon","coordinates":[[[[-75.16779683695418,39.93578257350401],[-75.15607096089737,39.93578257350401],[-75.15607096089737,39.94477296727664],[-75.16779683695418,39.94477296727664],[-75.16779683695418,39.93578257350401]]]]},
                    modificationData = {"name":"landcover","value":"open_water","shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.163414478302,39.94578893439719],[-75.16350030899046,39.94373258183417],[-75.16036748886108,39.94374903289991],[-75.16045331954956,39.94577248382194],[-75.163414478302,39.94578893439719]]]}},"type":""},
                    effectiveShape = {"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-75.16041092208279,39.94477296727664],[-75.16036748886108,39.94374903289991],[-75.16350030899046,39.94373258183417],[-75.16345688404456,39.94477296727664],[-75.16041092208279,39.94477296727664]]]}};

                App.map.set('areaOfInterest', sqKm);

                var modification = new models.ModificationModel(modificationData);

                assert.equal(JSON.stringify(modification.get('effectiveShape')), JSON.stringify(effectiveShape));
                assert.equal(Math.round(modification.get('effectiveArea')), 30295);
                assert.equal(modification.get('effectiveUnits'), 'm<sup>2</sup>');
            });

            it('has an effective area which is equal to the total area if the modification is contained within the AoI', function() {
                var sqKm = {"type":"MultiPolygon","coordinates":[[[[-82.09570407318586,39.905241037650875],[-82.08398342681413,39.905241037650875],[-82.08398342681413,39.91423143142352],[-82.09570407318586,39.91423143142352],[-82.09570407318586,39.905241037650875]]]]},
                    modificationData = {"name":"conservation_practice","value":"rain_garden","shape":{"type":"Feature","properties":{},"geometry":{"type":"Polygon","coordinates":[[[-82.08992958068848,39.91008187768712],[-82.09115266799927,39.909012024186794],[-82.08769798278809,39.90864991614042],[-82.08767652511597,39.91026292816486],[-82.08954334259033,39.91095420740544],[-82.08992958068848,39.91008187768712]]]}},"type":""};

                App.map.set('areaOfInterest', sqKm);

                var modification = new models.ModificationModel(modificationData);

                console.log(modification.get('effectiveShape'), modification.get('shape'));

                // Shapes are not tested because they will never exactly match due to rounding and math in turf intersect function
                assert.equal(Math.round(modification.get('effectiveArea')), Math.round(modification.get('area')));
                assert.equal(modification.get('effectiveUnits'), modification.get('units'));
            });
        });

        describe('ScenarioModel', function() {
            var modSpy, inputModSpy, saveSpy, resultSpy;

            beforeEach(function() {
                // These spies are attached to prototypes so that they can be attached before
                // the initialize method is called.
                modSpy = sinon.spy(models.ScenarioModel.prototype, 'updateModificationHash');
                inputModSpy = sinon.spy(models.ScenarioModel.prototype, 'updateInputModHash');
                saveSpy = sinon.spy(models.ScenarioModel.prototype, 'attemptSave');
                resultSpy = sinon.spy(models.ScenarioModel.prototype, 'fetchResults');
            });

            afterEach(function() {
                models.ScenarioModel.prototype.updateModificationHash.restore();
                models.ScenarioModel.prototype.updateInputModHash.restore();
                models.ScenarioModel.prototype.attemptSave.restore();
                models.ScenarioModel.prototype.fetchResults.restore();
            });

            describe('#initialize', function() {
                beforeEach(function() {
                    this.model = new models.ScenarioModel({
                        modifications: mocks.scenarios.sample.modifications
                    });
                });

                it('it sets attributes correctly', function() {
                    assert.equal(this.model.get('user_id'), App.user.get('id'),
                                 'user_id should equal the one in App');
                    assert.equal(this.model.get('inputs').at(0).get('name'),
                                 'precipitation', 'First input should be precipitation');
                    assert.deepEqual(this.model.get('modifications').toJSON(),
                                     new models.ModificationsCollection(mocks.scenarios.sample.modifications).toJSON(),
                                     'Should set modifications from argument to initialize');
                    assert.deepEqual(this.model.get('taskModel').toJSON(),
                                     App.currentProject.createTaskModel().toJSON(),
                                     'Should have set taskModel from App.currentProject');
                    assert.deepEqual(this.model.get('results').toJSON(),
                                     App.currentProject.createTaskResultCollection().toJSON(),
                                     'Should have set results from App.currentProject');
                });

                it('sets hashes', function() {
                    assert(modSpy.called, 'Should have called updateModificationHash');
                    assert(inputModSpy.called, 'Should have called updateInputModHash');
                    assert(modSpy.calledBefore(inputModSpy),
                           'Should have called updateInputModHash before updateModificationHash');
                });
            });

            describe('#getCollectionHash', function() {
                it('generates the same hash when given two collections in different order', function() {
                    var modificationsOne = new models.ModificationsCollection(),
                        modificationsTwo = new models.ModificationsCollection();

                    modificationsOne.add(new models.ModificationModel(mocks.modifications.sample1));
                    modificationsOne.add(new models.ModificationModel(mocks.modifications.sample2));

                    modificationsTwo.add(new models.ModificationModel(mocks.modifications.sample1OutOfOrder));
                    modificationsTwo.add(new models.ModificationModel(mocks.modifications.sample2));

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
                    assert.equal(model.get('modification_hash'), '65af065d7205cd998aeb0bf15c41f256');

                    var mod = new models.ModificationModel(mocks.modifications.sample2);
                    model.get('modifications').add(mod);
                    assert.equal(model.get('modification_hash'), 'ae69e823f926824a2fc22d9a5f1ea62c');

                    model.get('modifications').remove(mod);
                    assert.equal(model.get('modification_hash'), '65af065d7205cd998aeb0bf15c41f256');
                });

                it('is called when the modifications for a scenario changes', function() {
                    var model = new models.ScenarioModel({});

                    model.get('modifications').add(new models.ModificationModel(mocks.modifications.sample1));
                    assert.isTrue(modSpy.called);
                });

                it('is called before model#attemptSave when the modifications change', function() {
                    var model = new models.ScenarioModel({});

                    model.addModification(new models.ModificationModel(mocks.modifications.sample1));
                    assert.isTrue(modSpy.calledBefore(saveSpy));
                });
            });

            describe('#scenarioPolling', function() {
                function makeAssertions() {
                    assert.isTrue(resultSpy.called, 'fetchResults should have been called');
                    assert.isTrue(saveSpy.called, 'attemptSave should have been called');
                    assert.isTrue(resultSpy.calledBefore(saveSpy));
                }

                it('saves after polling finishes successfully', function() {
                    // Putting useFakeTimers in beforeEach
                    // and restore in afterEach makes more sense,
                    // but it causes testem to stall when in headless-mode
                    // for reasons I can't figure out.
                    this.clock = sinon.useFakeTimers();

                    var model = getTestScenarioModel();
                    this.server.respondWith('POST', '/api/modeling/start/tr55/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getTR55Started]);
                    this.server.respondWith('GET', '/api/modeling/jobs/8aef636e-2079-4f87-98dc-471d090141ad/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getJobSuccess]);
                    model.addModification(new models.ModificationModel(mocks.modifications.sample1));

                    this.clock.tick(1000);
                    makeAssertions();
                    this.clock.restore();
                });

                it('saves after polling fails', function() {
                    this.clock = sinon.useFakeTimers();

                    var model = getTestScenarioModel();
                    this.server.respondWith('POST', '/api/modeling/start/tr55/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getTR55Started]);
                    this.server.respondWith('GET', '/api/modeling/jobs/8aef636e-2079-4f87-98dc-471d090141ad/',
                                            [400, { 'Content-Type': 'application/json' }, mocks.polling.getJobFailure]);

                    model.addModification(new models.ModificationModel(mocks.modifications.sample1));

                    this.clock.tick(1000);
                    makeAssertions();
                    this.clock.restore();
                });
            });

            describe('#fetchResults', function() {
                beforeEach(function() {
                    this.results = new models.ResultCollection();
                    this.setPollingSpy = sinon.spy(this.results, 'setPolling');
                    this.setNullResultsSpy = sinon.spy(this.results, 'setNullResults');
                    this.scenarioModel = new models.ScenarioModel({});
                    this.setResultsSpy = new sinon.spy(this.scenarioModel, 'setResults');
                    this.scenarioModel.set('results', this.results);
                    this.server = sinon.fakeServer.create();
                    this.server.respondImmediately = true;
                    this.startJob = '1';
                    this.startResponse = {
                        job: this.startJob
                    };
                    this.server.respondWith('POST', '/api/modeling/start/tr55/',
                                            [ 200,
                                              { 'Content-Type': 'application/json' },
                                              JSON.stringify(this.startResponse) ]);
                    this.pollingResponse = mocks.polling.getJobSuccess;
                    this.server.respondWith('GET', '/api/modeling/jobs/1/',
                                            [ 200,
                                              { 'Content-Type': 'application/json' },
                                              this.pollingResponse ]);
                });

                function fetchResultsAssertions(self) {
                    assert(inputModSpy.calledTwice, 'updateInputModHash should have been called twice');
                    assert(self.setPollingSpy.calledTwice, 'setPolling should have been called twice');
                    assert(self.setPollingSpy.getCall(0).args[0], 'should have initially called setPolling(true)');
                    assert.isFalse(self.setPollingSpy.getCall(1).args[0], 'should have subsequently called setPolling(false)');
                }

                it('sets results to null on start failure', function(done) {
                    var self = this;
                    self.server.respondWith('POST', '/api/modeling/start/tr55/',
                                            [ 400, // Make request fail.
                                              { 'Content-Type': 'application/json' },
                                              JSON.stringify(self.startResponse) ]);

                    self.scenarioModel.fetchResults().startPromise.always(function() {
                        assert(self.setNullResultsSpy.calledOnce, 'setNullResults should have been called once');
                        assert.isFalse(self.setResultsSpy.called, 'setResults should not have been called');
                        assert(saveSpy.calledOnce, 'attemptSave should have been called once');
                        fetchResultsAssertions(self);
                        done();
                    });
                });

                it('sets results to null on polling failure', function(done) {
                    var self = this;
                    this.server.respondWith('GET', '/api/modeling/jobs/1/',
                                            [ 400, // Make request fail.
                                              { 'Content-Type': 'application/json' },
                                              JSON.stringify(this.pollingResponse) ]);

                    self.scenarioModel.fetchResults().pollingPromise.always(function() {
                        assert(self.setNullResultsSpy.calledOnce, 'setNullResults should have been called once');
                        assert.isFalse(self.setResultsSpy.called, 'setResults should not have been called');
                        assert(saveSpy.calledTwice, 'attemptSave should have been called twice');
                        fetchResultsAssertions(self);
                        done();
                    });
                });

                it('sets results on success', function(done) {
                    var self = this;
                    self.scenarioModel.fetchResults().pollingPromise.always(function() {
                        assert(self.setResultsSpy.calledOnce, 'setResults should have been called');
                        assert.isFalse(self.setNullResultsSpy.called, 'setNullResults should not have been called');
                        assert(saveSpy.calledTwice, 'attemptSave should have been called twice');
                        fetchResultsAssertions(self);
                        done();
                    });
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

                it ('sets Current Conditions as the first scenario and activates it', function() {
                    var collection = getTestScenarioCollection(),
                        cc = collection.findWhere({ 'is_current_conditions': true });

                    // Set Current Conditions to be the second item
                    collection.remove(cc);
                    collection.add(cc, { at: 1 });

                    assert.isFalse(collection.first().get('is_current_conditions'));

                    collection.makeFirstScenarioActive();

                    assert.isTrue(collection.first().get('is_current_conditions'));
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
                var realAlert, spyAlert;

                // Swap out window.alert so that testing can complete
                // automatically without the user being prompted that the
                // scenario name must be unique.
                before(function() {
                    realAlert = window.alert;
                });

                after(function() {
                    window.alert = realAlert;
                });

                beforeEach(function() {
                    window.alert = spyAlert = sinon.spy();
                });

                it('trims whitespace from the provided new name', function() {
                    var collection = getTestScenarioCollection();

                    collection.updateScenarioName(collection.at(0), 'New Name       ');

                    assert.isFalse(spyAlert.called);
                    assert.equal(collection.at(0).get('name'), 'New Name');
                });

                it('ignores case when comparing the new name with existing names', function() {
                    var collection = getTestScenarioCollection();

                    // There's already a scenario with the name "New Scenario 1"
                    collection.updateScenarioName(collection.at(0), 'NEW scenArio 1');

                    assert.isTrue(spyAlert.calledOnce);
                    assert.equal(collection.at(0).get('name'), 'Current Conditions');
                });

                it('will not rename the scenario if the new name matches an existing name', function() {
                    var collection = getTestScenarioCollection();

                    // There's already a scenario with the name "Current Conditions"
                    collection.updateScenarioName(collection.at(1), 'Current Conditions');

                    assert.isTrue(spyAlert.calledOnce);
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
