"use strict";

require('../core/setup');

var _ = require('lodash'),
    $ = require('jquery'),
    Backbone = require('backbone'),
    assert = require('chai').assert,
    sinon = require('sinon'),
    mocks = require('./mocks'),
    settings = require('../core/settings'),
    utils = require('../core/utils'),
    models = require('./models'),
    AoiVolumeModel = require('./tr55/models').AoiVolumeModel,
    views = require('./views'),
    App = require('../app.js'),
    testUtils = require('../core/testUtils'),
    modelingUtils = require('./utils'),
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

        settings.set('unit_scheme', 'METRIC');
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
        describe('ScenarioToolbarView', function() {
            it('adds a new scenario when the add changes button is clicked', function() {
                var projectModel = getTestProject(),
                    collection = projectModel.get('scenarios'),
                    view = new views.ScenarioToolbarView({
                        collection: collection,
                        model: projectModel,
                    });

                $(sandboxSelector).html(view.render().el);

                assert.equal(collection.length, 1);
                $('#sandbox #add-changes').trigger('click');
                assert.equal(collection.length, 2);
            });
        });

        describe('ScenarioToolbarView', function() {
            it('does not show the non-current condition scenario buttons', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioToolbarView({
                        collection: collection,
                        model: getTestProject(),
                    });

                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox #add-changes').text(), '');
                assert.equal($('#sandbox #download-cc-gms').text(), '');
            });
        });

        describe('ScenarioButtonsView', function() {
            it('adds a new scenario when the add scenario button is clicked', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioButtonsView({
                        collection: collection,
                        projectModel: new models.ProjectModel()
                    });

                $(sandboxSelector).html(view.render().el);

                assert.equal(collection.length, 3);
                $('#sandbox #add-scenario').trigger('click');
                assert.equal(collection.length, 4);
            });
        });

        describe('ScenarioDropDownMenuView', function() {
            it('sets the selected scenario to active', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                $('#sandbox .dropdown-menu li:nth-child(2) a').trigger('click');

                assert.isTrue(collection.at(1).get('active'));
            });
        });

        describe('ScenarioDropDownMenuView', function() {
            it('disables dropdown if there are no scenarios', function() {
                var collection = new models.ScenariosCollection([]),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                assert.isTrue($('#sandbox .scenario-dropdown').get(0).disabled);
            });

            it('disables dropdown if there is only current conditions', function() {
                var collection = getTestProject().get('scenarios'),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                assert.isTrue($('#sandbox .scenario-dropdown').get(0).disabled);
            });

            it('renders multiple dropdown items if there are multiple scenarios', function() {
                var collection = getTestScenarioCollection(),
                    view = new views.ScenarioDropDownMenuView({ collection: collection });

                $(sandboxSelector).html(view.render().el);
                assert.equal($('#sandbox ul.dropdown-menu > li').length, collection.length);
            });
        });

        describe('ScenarioDropDownMenuItemView', function() {
            function checkMenuItemsMatch(expectedItems) {
                var $scenarioItemActions = $('#sandbox i'),
                    menuItems = $scenarioItemActions.map(function() {
                        return $(this).get(0).title;
                    }).get();
                assert.deepEqual(menuItems, expectedItems);
            }

            it('renders action icons for editing if the user owns the project', function() {
                App.user.set('id', 1);
                var project = getTestProject(),
                    collection = getTestScenarioCollection();

                project.get('scenarios').invoke('set', 'user_id', 1);

                var view = new views.ScenarioDropDownMenuOptionsView({ model: collection.at(1) });

                $(sandboxSelector).html(view.render().el);
                checkMenuItemsMatch(['Share', 'Duplicate', 'Delete', 'Rename']);
            });

            it('renders no action icons if the user does not own the project', function() {
                App.user.set('id', 8);
                var project = getTestProject();

                project.get('scenarios').invoke('set', 'user_id', 1);

                var view = new views.ScenarioDropDownMenuOptionsView({  model: project.get('scenarios').at(0) });

                $(sandboxSelector).html(view.render().el);
                checkMenuItemsMatch([]);
            });
        });

        describe('Tr55ToolbarView', function() {
            beforeEach(function() {
                this.userId = 1;
                App.user.id = this.userId;
                this.model = new models.ScenarioModel({
                    name: 'New Scenario',
                    modifications: []
                });
                this.view = new views.Tr55ToolbarView({
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
                assert.equal($('#sandbox #mod-landcover tbody tr td:nth-child(2)').text(), '44.42 km²');
                assert.equal($('#sandbox #mod-conservationpractice tbody tr td:first-child').text(), 'Rain Garden');
                assert.equal($('#sandbox #mod-conservationpractice tbody tr td:nth-child(2)').text(), '106.40 km²');
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

                assert.equal($('#sandbox .dropdown-menu > li').length, preSaveMenuItems.length);
                $('#sandbox .dropdown-menu li').each(function() {
                    assert.include(preSaveMenuItems, $(this).text().trim());
                });
            });

            it('displays all the options in the drop down menu if the project is saved', function() {
                // Let the application know which user we are.
                App.user.set('id', 1);
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}',
                    postSaveMenuItems = [
                        'Delete',
                        'Rename',
                        '',
                        'My Projects'
                    ];

                this.server.respondWith('POST', '/mmw/modeling/projects/',
                                        [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $(sandboxSelector).html(view.render().el);

                assert.equal($('#sandbox .dropdown-menu > li').length, postSaveMenuItems.length);
                $('#sandbox .dropdown-menu > li').each(function() {
                    assert.include(postSaveMenuItems, $(this).text().trim());
                });
            });

            it('displays no options if the user does not own the project', function() {
                // Let the application know which user we are.
                App.user.set('id', 8);
                var project = getTestProject(),
                    view = new views.ProjectMenuView({ model: project }),
                    projectResponse = '{"id":21,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[],"name":"Test Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}';

                this.server.respondWith('POST', '/mmw/modeling/projects/',
                                        [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $(sandboxSelector).html(view.render().el);
                assert.isUndefined($('#project-settings').el);
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
                        'Delete',
                        'Rename',
                        'Embed in ITSI',
                        '',
                        'My Projects'
                    ];

                this.server.respondWith('POST', '/mmw/modeling/projects/',
                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                project.save();

                $('#sandbox').html(view.render().el);

                assert.equal($('#sandbox .dropdown-menu li').length, postSaveMenuItems.length);
                $('#sandbox .dropdown-menu li').each(function() {
                    assert.include(postSaveMenuItems, $(this).text().trim());
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

        describe('ResultModel', function() {
            it('Generates TR-55 CSV Correctly', function () {
                var aoi = mocks.polygons.tr55SquareKm,
                    aoiVolumeModel = new AoiVolumeModel({areaOfInterest: aoi}),
                    scenario = getTR55ScenarioModel(),
                    isCurrentConditions = scenario.get('is_current_conditions'),
                    runoffResult = scenario.get('results').findWhere({name: 'runoff'}),
                    qualityResult = scenario.get('results').findWhere({name: 'quality'});

                var runoffCSV = '"Runoff Partition","Water Depth (cm)","Water Volume (m³)"\n' +
                                '"Runoff","1.603","16,052.95"\n' +
                                '"Evapotranspiration","0.051","511.76"\n' +
                                '"Infiltration","0.846","8,475.61"',
                    qualityCSV = '"Quality Measure","Load (kg)","Loading Rate (kg/ha)","Average Concentration (mg/L)"\n' +
                                 '"Total Suspended Solids","2,558.953","25.548","159.4"\n' +
                                 '"Total Nitrogen","56.575","0.565","3.5"\n' +
                                 '"Total Phosphorus","5.651","0.056","0.4"';

                assert.equal(runoffCSV, runoffResult.toTR55RunoffCSV(isCurrentConditions, aoiVolumeModel));
                assert.equal(qualityCSV, qualityResult.toTR55WaterQualityCSV(isCurrentConditions, aoiVolumeModel));
            });

            it('Generates MapShed CSV Correctly', function () {
                var scenario = getSubbasinScenarioModel(),
                    runoffResult = scenario.get('results').findWhere({name: 'runoff'}),
                    qualityResult = scenario.get('results').findWhere({name: 'quality'});

                var runoffCSV = '"Month","Stream Flow (cm)","Surface Runoff (cm)","Subsurface Flow (cm)","Point Src Flow (cm)","ET (cm)","Precip (cm)"\n' +
                                '"Jan","179.96","1.58","4.57","173.81","0.57","7.92"\n' +
                                '"Feb","163.29","1.54","4.76","156.99","0.87","7.25"\n' +
                                '"Mar","180.82","1.43","5.59","173.81","2.53","8.75"\n' +
                                '"Apr","173.89","0.35","5.34","168.21","5.04","8.91"\n' +
                                '"May","177.95","0.38","3.76","173.81","9.11","9.63"\n' +
                                '"Jun","170.65","0.44","2.01","168.21","11.28","9.26"\n' +
                                '"Jul","175.48","0.74","0.94","173.81","10.56","10.81"\n' +
                                '"Aug","174.68","0.48","0.39","173.81","8.83","9.15"\n' +
                                '"Sep","169.20","0.55","0.44","168.21","5.49","8.69"\n' +
                                '"Oct","175.11","0.59","0.70","173.81","4.02","6.98"\n' +
                                '"Nov","170.53","1.01","1.31","168.21","2.21","8.40"\n' +
                                '"Dec","178.46","1.35","3.30","173.81","1.07","8.71"\n' +
                                '"Total","2,090.02","10.43","33.09","2,046.50","61.59","104.47"',
                    qualityLandUseCSV = '"Sources","Sediment (kg)","Total Nitrogen (kg)","Total Phosphorus (kg)"\n' +
                                        '"Hay/Pasture","525,778.1","2,680.8","1,011.1"\n' +
                                        '"Cropland","2,366,486.8","9,873.3","2,799.1"\n' +
                                        '"Wooded Areas","26,327.8","1,006.5","75.0"\n' +
                                        '"Wetlands","413.8","511.8","27.3"\n' +
                                        '"Open Land","9,092.3","155.9","11.4"\n' +
                                        '"Barren Areas","25.2","65.6","2.2"\n' +
                                        '"Low-Density Mixed","122,541.6","3,097.8","331.4"\n' +
                                        '"Medium-Density Mixed","518,413.5","12,026.5","1,237.9"\n' +
                                        '"High-Density Mixed","330,756.7","7,673.1","789.8"\n' +
                                        '"Low-Density Open Space","222,403.8","5,622.2","601.4"\n' +
                                        '"Farm Animals","0.0","35,168.6","8,233.0"\n' +
                                        '"Stream Bank Erosion","1,982,008,213.0","1,144,442.0","474,117.0"\n' +
                                        '"Subsurface Flow","0.0","469,466.9","5,868.2"\n' +
                                        '"Point Sources","0.0","617,635.1","209,745.7"\n' +
                                        '"Septic Systems","0.0","27,777.3","0.0"',
                    qualitySummaryCSV = '"Sources","Sediment","Total Nitrogen","Total Phosphorus","Mean Flow (m³/year)","Mean Flow (m³/s)"\n' +
                                        '"Total Loads (kg)","1,985,908,048.7","2,331,581.3","704,248.9","10,717,549,462","339.85"\n' +
                                        '"Loading Rates (kg/ha)","38,726.98","45.47","13.73","",""\n' +
                                        '"Mean Annual Concentration (mg/L)","185.29","0.22","0.07","",""\n' +
                                        '"Mean Low-Flow Concentration (mg/L)","198.57","0.29","0.07","",""';

                assert.equal(runoffCSV, runoffResult.toMapShedHydrologyCSV());
                assert.equal(qualityLandUseCSV, qualityResult.toMapShedWaterQualityLandUseCSV());
                assert.equal(qualitySummaryCSV, qualityResult.toMapShedWaterQualitySummaryCSV());
            });
        });

        describe('ProjectModel', function() {
            describe('#saveProjectAndScenarios', function() {
                beforeEach(function() {
                    App.user.set('id', 1);
                });

                it('calls #save on the project and sets the id on every scenario that\'s part of the project', function() {
                    var projectResponse = '{"id":57,"user":{"id":1,"username":"test","email":"test@azavea.com"},"name":"My Project","area_of_interest":{},"is_private":true,"model_package":"tr-55","created_at":"2015-06-03T20:09:11.988948Z","modified_at":"2015-06-03T20:09:11.988988Z"}';
                    this.server.respondWith('POST', '/mmw/modeling/projects/',
                                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);

                    var project = getTestProject(getTestScenarioCollection()),
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

                    this.server.respondWith('POST', '/mmw/modeling/projects/',
                                            [ 200, { 'Content-Type': 'application/json' }, projectResponse ]);
                    this.server.respondWith('POST', '/mmw/modeling/scenarios/',
                                            [ 200, { 'Content-Type': 'application/json' }, scenarioResponse ]);

                    var project = getTestProject(getTestScenarioCollection());

                    project.saveProjectAndScenarios();

                    assert.equal(project.get('scenarios').at(0).get('project'), 21);
                    assert.equal(project.get('scenarios').at(1).get('project'), 21);
                });
            });

            describe('#parse', function() {
                it('correctly constructs the nested project model from the server response', function(done) {
                    var projectResponse = '{"id":22,"user":{"id":1,"username":"test","email":"test@azavea.com"},"scenarios":[{"id":28,"name":"Current Conditions","is_current_conditions":true,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-01T20:23:37.689469Z","modified_at":"2015-06-03T19:09:17.795635Z","project":22},{"id":30,"name":"New Scenario 1","is_current_conditions":false,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-03T15:46:46.794796Z","modified_at":"2015-06-03T19:09:17.902091Z","project":22},{"id":31,"name":"New Scenario","is_current_conditions":false,"modifications":[],"modification_hash":null,"results":null,"created_at":"2015-06-03T19:09:17.983346Z","modified_at":"2015-06-03T19:09:17.983386Z","project":22}],"name":"real deal","area_of_interest":{"type":"MultiPolygon","coordinates":[[[[-76.28631591796875,40.32037295438762],[-76.28219604492188,39.97817244470628],[-75.15609741210938,39.9602803542957],[-75.1519775390625,40.31827882257792],[-76.28631591796875,40.32037295438762]]]]},"is_private":true,"model_package":"tr-55","created_at":"2015-06-01T20:23:37.535349Z","modified_at":"2015-06-03T19:09:17.670821Z"}';

                    this.server.respondWith('GET', '/mmw/modeling/projects/22',
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

                assert.equal(model.get('units'), 'm²');
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
                assert.equal(modification.get('effectiveUnits'), 'm²');
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
                    assert.equal(model.get('modification_hash'), '29597d88c74d4c2139567d6e3ffaa44d');

                    var mod = new models.ModificationModel(mocks.modifications.sample2);
                    model.get('modifications').add(mod);
                    assert.equal(model.get('modification_hash'), 'aef9730ccb49e3d15c56e22d5207cd94');

                    model.get('modifications').remove(mod);
                    assert.equal(model.get('modification_hash'), '29597d88c74d4c2139567d6e3ffaa44d');
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
                    this.server.respondWith('POST', '/mmw/modeling/start/tr55/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getTR55Started]);
                    this.server.respondWith('GET', '/mmw/modeling/jobs/8aef636e-2079-4f87-98dc-471d090141ad/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getJobSuccess]);
                    model.addModification(new models.ModificationModel(mocks.modifications.sample1));

                    this.clock.tick(1000);
                    makeAssertions();
                    this.clock.restore();
                });

                it('saves after polling fails', function() {
                    this.clock = sinon.useFakeTimers();

                    var model = getTestScenarioModel();
                    this.server.respondWith('POST', '/mmw/modeling/start/tr55/',
                                            [200, { 'Content-Type': 'application/json' }, mocks.polling.getTR55Started]);
                    this.server.respondWith('GET', '/mmw/modeling/jobs/8aef636e-2079-4f87-98dc-471d090141ad/',
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
                    this.server.respondWith('POST', '/mmw/modeling/tr55/',
                                            [ 200,
                                              { 'Content-Type': 'application/json' },
                                              JSON.stringify(this.startResponse) ]);
                    this.pollingResponse = mocks.polling.getJobSuccess;
                    this.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                            [ 200,
                                              { 'Content-Type': 'application/json' },
                                              this.pollingResponse ]);
                });

                function fetchResultsAssertions(self) {
                    // TODO: Re-enable tests https://github.com/WikiWatershed/model-my-watershed/issues/3442
                    // assert(inputModSpy.calledTwice, 'updateInputModHash should have been called twice');
                    assert(self.setPollingSpy.calledTwice, 'setPolling should have been called twice');
                    assert(self.setPollingSpy.getCall(0).args[0], 'should have initially called setPolling(true)');
                    assert.isFalse(self.setPollingSpy.getCall(1).args[0], 'should have subsequently called setPolling(false)');
                }

                it('sets results to null on start failure', function(done) {
                    var self = this;
                    self.server.respondWith('POST', '/mmw/modeling/tr55/',
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
                    this.server.respondWith('GET', '/mmw/modeling/jobs/1/',
                                            [ 400, // Make request fail.
                                              { 'Content-Type': 'application/json' },
                                              JSON.stringify(this.pollingResponse) ]);

                    self.scenarioModel.fetchResults().pollingPromise.always(function() {
                        assert(self.setNullResultsSpy.calledOnce, 'setNullResults should have been called once');
                        assert.isFalse(self.setResultsSpy.called, 'setResults should not have been called');
                        // TODO: Re-enable tests https://github.com/WikiWatershed/model-my-watershed/issues/3442
                        // assert(saveSpy.calledTwice, 'attemptSave should have been called twice');
                        fetchResultsAssertions(self);
                        done();
                    });
                });

                it('sets results on success', function(done) {
                    var self = this;
                    self.scenarioModel.fetchResults().pollingPromise.always(function() {
                        assert(self.setResultsSpy.calledOnce, 'setResults should have been called');
                        assert.isFalse(self.setNullResultsSpy.called, 'setNullResults should not have been called');
                        // TODO: Re-enable tests https://github.com/WikiWatershed/model-my-watershed/issues/3442
                        // assert(saveSpy.calledTwice, 'attemptSave should have been called twice');
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

                it('give the new scenario a name that includes "New Scenario"', function() {
                    var collection = getTestScenarioCollection();

                    collection.createNewScenario();

                    assert.isTrue(_.includes(collection.at(3).get('name'), 'New Scenario'));
                });
            });

            describe('#validateNewScenarioName', function() {
                it ('returns null if valid rename', function() {
                    var collection = getTestScenarioCollection(),
                        boundFunc = _.bind(collection.validateNewScenarioName, collection.at(1)),
                        validationMessage = boundFunc('My New Unique Scenario Name');

                    assert.equal(validationMessage, null);
                });

                it('ignores case when comparing the new name with existing names', function() {
                    var collection = getTestScenarioCollection(),
                        boundFunc = _.bind(collection.validateNewScenarioName, collection.at(1)),
                        validationMessage = boundFunc('cUrreNt condiTIONS');

                    assert.notEqual(validationMessage, null);
                });

                it('will not show error when leaving name as is', function() {
                    var collection = getTestScenarioCollection(),
                        boundFunc = _.bind(collection.validateNewScenarioName, collection.at(1)),
                        validationMessage = boundFunc('New Scenario 1');

                    assert.equal(validationMessage, null);
                });
            });


            describe('#updateScenarioName', function() {
                it('trims whitespace from the provided new name', function() {
                    var collection = getTestScenarioCollection();

                    collection.updateScenarioName(collection.at(1), 'New Name       ');

                    assert.equal(collection.at(1).get('name'), 'New Name');
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

    describe('Utils', function() {
        describe('#getFileName', function() {
            var filename = 'phillyRCP4520802100daily.csv',
                ext = '.csv',
                s3BucketPath = 'https://mmw-staging-data-us-east-1.s3.amazonaws.com/p1470/s2603/phillyRCP4520802100daily.csv?AWSAccessKeyId=XXX&Expires=1589820561&x-amz-security-token=YYY&Signature=ZZZ',
                localPath = '/media/p32/s56/phillyRCP4520802100daily.csv';

            it('returns the file name from an S3 Bucket Path', function() {
                assert.equal(modelingUtils.getFileName(s3BucketPath, ext), filename);
            });

            it('returns the file name from a local DJANGO_MEDIA_ROOT path', function() {
                assert.equal(modelingUtils.getFileName(localPath, ext), filename);
            });
        });
    });
});

function getTestScenarioModel() {
    return new models.ScenarioModel(mocks.scenarios.sample);
}

function getTR55ScenarioModel() {
    return new models.ScenarioModel(mocks.scenarios.tr55SquareKm);
}

function getSubbasinScenarioModel() {
    return new models.ScenarioModel(mocks.scenarios.subbasin);
}

function getTestScenarioCollection() {
    var collection = new models.ScenariosCollection([
        new models.ScenarioModel({
            name: 'Current Conditions',
            is_current_conditions: true
        }),
        new models.ScenarioModel({
            id: 1,
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

function getTestProject(optionalScenarios) {
    var project = new models.ProjectModel({
        name: 'My Project',
        created_at: Date.now(),
        area_of_interest: '[]',
        user_id: 1,
        scenarios: optionalScenarios || new models.ScenariosCollection([
            new models.ScenarioModel({
                name: 'Current Conditions',
                is_current_conditions: true,
                active: true,
            }),
        ])
    });

    return project;
}
