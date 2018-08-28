'use strict';

var moment = require('moment'),
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
                        return m
                            .get('result')
                            .monthly;
                    });

            return accumulator.concat(nextAttribute);
        }, []);

    return constants
        .monthNames
        .map(function(name, key) {
            return {
                key: key,
                name: moment(name, 'MMM').format('MMMM'),
                unit: 'cm',
                values: scenarioData
                    .map(function(element) {
                        return element[key];
                    }),
                selectedAttribute: constants.hydrologyKeys.streamFlow,
            };
        });
}

module.exports = {
    mapScenariosToHydrologyChartData: mapScenariosToHydrologyChartData,
    mapScenariosToHydrologyTableData: mapScenariosToHydrologyTableData,
};
