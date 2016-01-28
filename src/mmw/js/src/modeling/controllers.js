"use strict";

var $ = require('jquery'),
    _ = require('lodash'),
    Backbone = require('../../shim/backbone'),
    App = require('../app'),
    settings = require('../core/settings'),
    router = require('../router').router,
    views = require('./views'),
    models = require('./models');

var ModelingController = {
    projectPrepare: function(projectId) {
        if (!projectId && !App.map.get('areaOfInterest')) {
            router.navigate('', { trigger: true });
            return false;
        }

        // The mask layer should always be applied to the map when entering
        // analyze mode
        if (!App.map.get('maskLayerApplied')) {
            App.map.set('maskLayerApplied', true);
        }

        if (settings.get('activityMode')) {
            // Only one project allowed in Activity Mode. Save current project
            // and if in embedded mode, update interactive state for container.
            var project = App.currentProject,
                map = App.map;

            if (project && project.get('scenarios').isEmpty()) {
                project.set({
                    'area_of_interest': map.get('areaOfInterest'),
                    'area_of_interest_name': map.get('areaOfInterestName')
                });
                project
                    .save()
                    .done(function() {
                        if (settings.get('itsi_embed')) {
                            App.itsi.setLearnerUrl('project/' + project.id + '/draw');
                        }
                    });
            }
        } else {
            // Multiple projects allowed in Regular Mode. Nullify current
            // project since a new one will be created and saved by the
            // Modelling Controller.
            App.currentProject = null;
        }
    },

    project: function(projectId, scenarioParam) {
        var project;

        if (projectId) {
            project = new models.ProjectModel({
                id: projectId
            });

            App.currentProject = project;

            project
                .fetch()
                .done(function() {
                    var lock = $.Deferred();

                    App.map.set({
                        'areaOfInterest': project.get('area_of_interest'),
                        'areaOfInterestName': project.get('area_of_interest_name')
                    });
                    initScenarioEvents(project);
                    initViews(project, lock);

                    lock.done(function() {
                        if (scenarioParam) {
                            var scenarioId = parseInt(scenarioParam, 10),
                                scenarios = project.get('scenarios');

                            if (!scenarios.setActiveScenarioById(scenarioId)) {
                                scenarios.makeFirstScenarioActive();
                            }
                        } else {
                            project.get('scenarios').makeFirstScenarioActive();
                        }

                        // If this project is an activity then the application's behavior changes.
                        if (project.get('is_activity')) {
                            settings.set('activityMode', true);
                        }

                        // Send URL to parent if in embed mode
                        updateItsiFromEmbedMode();
                    });
                })
                .fail(function() {
                    // TODO Make handling project load errors more robust

                    console.log("[ERROR] Could not load project.");
                    App.currentProject = null;
                });
        } else {
            if (App.currentProject && settings.get('activityMode')) {
                project = App.currentProject;
                // Reset flag is set so clear off old project data.
                if (project.get('needs_reset')) {
                    project.set({
                        'user_id': App.user.get('id'),
                        'area_of_interest': App.map.get('areaOfInterest'),
                        'area_of_interest_name': App.map.get('areaOfInterestName'),
                        'needs_reset': false
                    });

                    // Clear current scenarios and start over.
                    // Must convert to an array first to avoid conflicts with
                    // collection events that are disassociating the model during
                    // the loop.
                    var locks = [];
                    _.each(project.get('scenarios').toArray(), function(model) {
                        var $lock = $.Deferred();
                        locks.push($lock);
                        model.destroy({
                            success: function() {
                                $lock.resolve();
                            }
                        });
                    });

                    // When all models have been deleted...
                    $.when.apply($, locks).then(function() {
                        setupNewProjectScenarios(project);

                        // Don't reinitialize scenario events.
                        if (!project.get('scenarios_events_initialized')) {
                            initScenarioEvents(project);
                            project.set('scenarios_events_initialized', true);
                        }
                        // Make sure to save the new project id onto scenarios.
                        project.addIdsToScenarios();
                        // Save to ensure we capture AOI.
                        project.save();

                        // Now render.
                        initViews(project);

                        updateUrl();
                    });
                } else {
                    initViews(project);
                    updateUrl();
                }
            } else {
                var lock = $.Deferred();

                if (!App.currentProject) {
                    // Only make new project if this is the first time
                    // hitting the modeling views.
                    if (!App.projectNumber) {
                        project = makeProject(lock);
                    } else {
                        project = reinstateProject(App.projectNumber, lock);
                    }

                    App.currentProject = project;
                    if (!App.projectNumber) {
                        setupNewProjectScenarios(project);
                    }
                } else {
                    project = App.currentProject;
                    updateUrl();
                    lock.resolve();
                }

                lock.done(function() {
                    project.on('change:id', updateUrl);
                    initScenarioEvents(project);
                    initViews(project);
                    if (App.projectNumber) {
                        updateUrl();
                    }
                });
            }
        }

        App.state.set('current_page_title', 'Model');
    },

    projectCleanUp: function() {
        if (App.currentProject) {
            var scenarios = App.currentProject.get('scenarios');

            App.currentProject.off('change:id', updateUrl);
            scenarios.off('change:activeScenario change:id', updateScenario);
            // App.projectNumber holds the number of the project that was
            // in use when the user left the `/project` page.  The intent
            // is to allow the same project to be returned-to via the UI
            // arrow buttons (see issue #690).
            App.projectNumber = scenarios.at(0).get('project');
        }

        App.getMapView().updateModifications(null);
        App.rootView.subHeaderRegion.empty();
        App.rootView.sidebarRegion.empty();
    },

    // Since we handle redirects after ITSI sign-up within Backbone,
    // but project cloning is done only on server side, we redirect
    // the project cloning route back to the server.
    projectClone: function() {
        window.location.replace(window.location.href);
    },

    // Load the project's area of interest, and move to Draw view
    projectDraw: function(projectId) {
        var project = new models.ProjectModel({
            id: projectId
        });

        App.currentProject = project;

        project
            .fetch()
            .done(function() {
                App.map.set({
                    'areaOfInterest': project.get('area_of_interest'),
                    'areaOfInterestName': project.get('area_of_interest_name')
                });
                if (project.get('scenarios').isEmpty()) {
                    // No scenarios available. Set the `needs_reset` flag so
                    // that this project is properly initialized by the
                    // modeling controller.
                    project.set('needs_reset', true);
                }

                if (project.get('is_activity')) {
                    settings.set('activityMode', true);
                }
            })
            .fail(function() {
                App.currentProject = null;
            })
            .always(function() {
                router.navigate('/', { trigger: true });
            });
    }
};

function updateItsiFromEmbedMode() {
    if (settings.get('itsi_embed')) {
        App.itsi.setLearnerUrl(Backbone.history.getFragment());
    }
}

function updateUrl() {
    // Use replace: true, so that the back button will work as expected.
    router.navigate(App.currentProject.getReferenceUrl(), { replace: true });
    updateItsiFromEmbedMode();
}

function updateScenario(scenario) {
    App.getMapView().updateModifications(scenario.get('modifications'));
    updateUrl();
}

function initScenarioEvents(project) {
    project.get('scenarios').on('change:activeScenario change:id', updateScenario);
}

function setupNewProjectScenarios(project) {
    project.get('scenarios').add([
        new models.ScenarioModel({
            name: 'Current Conditions',
            is_current_conditions: true,
            active: true
        }),
        new models.ScenarioModel({
            name: 'New Scenario'
        })
        // Silent is set to true because we don't actually want to save the
        // project without some user interaction. This initialization
        // should set the stage but we should wait for something else to
        // happen to save. Ideally we will move this into the project
        // creation when we get rid of the global.
    ], { silent: true });
}

function initViews(project, lock) {
    var resultsView = new views.ResultsView({
            model: project,
            lock: lock
        }),
        modelingHeader = new views.ModelingHeaderView({
            model: project
        });

    App.rootView.subHeaderRegion.show(modelingHeader);
    App.rootView.sidebarRegion.show(resultsView);
}

function makeProject(lock) {
    var project = new models.ProjectModel({
        name: 'Untitled Project',
        created_at: Date.now(),
        area_of_interest: App.map.get('areaOfInterest'),
        area_of_interest_name: App.map.get('areaOfInterestName'),
        scenarios: new models.ScenariosCollection()
    });
    lock.resolve();
    return project;
}

function reinstateProject(number, lock) {
    var project = new models.ProjectModel({id: App.projectNumber});

    project
        .fetch()
        .done(function() {
            App.map.set({
                'areaOfInterest': project.get('area_of_interest'),
                'areaOfInterestName': project.get('area_of_interest_name')
            });
            lock.resolve();
        });

    return project;
}


module.exports = {
    ModelingController: ModelingController
};
