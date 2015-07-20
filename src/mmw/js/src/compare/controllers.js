"use strict";

var _ = require('underscore'),
    App = require('../app'),
    views = require('./views'),
    modelingModels = require('../modeling/models.js');

function makeTestProject() {
    App.currProject = new modelingModels.ProjectModel({
        'name': 'Test Project'
    });
    var modifications = [
        {
            'name': 'landcover',
            'value':'commercial',
            'shape': {
                'type':'Feature',
                'properties': {},
                'geometry': {
                    'type':'Polygon',
                    'coordinates':[[[-75.29891967773438,39.968174500886306],[-75.31986236572266,39.94396289639476],[-75.28690338134766,39.94080422911384],[-75.29891967773438,39.968174500886306]]]}},
            'type':'',
            'area':4.104278178806597,
            'units':'km<sup>2</sup>'
        },
        {
            'name':'conservation_practice',
            'value':'veg_infil_basin',
            'shape': {
                'type':'Feature',
                'properties':{},
                'geometry':{
                    'type':'Polygon',
                    'coordinates':[[[-75.22991180419922,39.95580659996906],[-75.2511978149414,39.93869836991711],[-75.21343231201172,39.935802707704816],[-75.22991180419922,39.95580659996906]]]}},
            'type': '',
            'area':3.361859935949525,
            'units':'km<sup>2</sup>'
        }],
        scenarios = new modelingModels.ScenariosCollection(
            _.map(_.range(0,7), function(scenarioInd) {
                return new modelingModels.ScenarioModel({
                    name: 'Scenario ' + scenarioInd,
                    modifications: modifications
                });
            }));
    App.currProject.set('scenarios', scenarios);
    return App.currProject;
}

var CompareController = {
    compare: function() {
        var compareWindow = new views.CompareWindow({
            model: makeTestProject()
        });

        App.rootView.footerRegion.show(compareWindow);
    },

    compareCleanUp: function() {
        App.rootView.footerRegion.empty();
    }

};

module.exports = {
    CompareController: CompareController
};
