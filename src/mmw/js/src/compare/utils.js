'use strict';

var _ = require('lodash'),
    moment = require('moment'),
    constants = require('./constants');

function mapScenariosToHydrologyChartData(scenarios, key) {
    return scenarios
        .map(function(scenario) {
            return scenario
                .get('results')
                .models
                .reduce(function(accumulator, next) {
                    if (next.get('displayName') !== constants.HYDROLOGY) {
                        return accumulator;
                    }

                    return accumulator.concat(next
                        .get('result')
                        .monthly
                        .map(function(result) {
                            return result[key];
                        }));
                }, []);
        });
}

function mapScenariosToHydrologyTableData(scenarios) {
    var scenarioData = scenarios
        .models
        .reduce(function(accumulator, next) {
            var results = next.get('results'),
                nextAttribute = results
                    .filter(function(n) {
                        return n.get('displayName') === constants.HYDROLOGY;
                    })
                    .map(function(m) {
                        // Convert cm to m
                        return m.get('result').monthly.map(function(monthly) {
                            return _.mapValues(monthly, function(value) {
                                return value / 100;
                            });
                        });
                    });

            return accumulator.concat(nextAttribute);
        }, []);

    return constants
        .monthNames
        .map(function(name, key) {
            return {
                key: key,
                name: moment(name, 'MMM').format('MMMM'),
                unit: 'LENGTH_S',
                values: scenarioData
                    .map(function(element) {
                        return element[key];
                    }),
                selectedAttribute: constants.hydrologyKeys.streamFlow,
            };
        });
}
/**
 * Returns a list of selections for water quality, filtered down to
 * only those that are present in all scenarios. This allows for
 * opening the Compare View when there are old scenarios with
 * "Other Upland Areas", and new scenarios with "Low-Density Open Space".
 * In this case, neither of these will be shown in the Compare View.
 *
 * @param scenarios ScenarioCollection
 */
function getQualitySelections(scenarios) {
    return _.filter(constants.gwlfeQualitySelectionOptionConfig,
                    function(selection) {
        return scenarios.every(function(scenario) {
            var result = scenario
                         .get('results')
                         .findWhere({ name: 'quality' })
                         .get('result');

            return _.some(result[selection.group], function(load) {
                return load.Source === selection.name;
            });
        });
    });
}

module.exports = {
    mapScenariosToHydrologyChartData: mapScenariosToHydrologyChartData,
    mapScenariosToHydrologyTableData: mapScenariosToHydrologyTableData,
    getQualitySelections: getQualitySelections,
};
