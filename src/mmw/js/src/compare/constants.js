'use strict';

var CHARTS = 'charts',
    TABLE = 'table',
    MIN_VISIBLE_SCENARIOS = 5,
    CHART_AXIS_WIDTH = 82,
    COMPARE_COLUMN_WIDTH = 134,
    HYDROLOGY = 'Hydrology',
    SCENARIO_COLORS = [
        '#3366cc','#dc3912','#ff9900','#109618','#990099', '#0099c6', '#dd4477',
        '#66aa00','#b82e2e','#316395','#3366cc','#994499', '#22aa99','#aaaa11',
        '#6633cc','#e67300','#8b0707','#651067','#329262', '#5574a6','#3b3eac',
        '#b77322','#16d620','#b91383','#f4359e','#9c5935', '#a9c413','#2a778d',
        '#668d1c','#bea413','#0c5922','#743411'
    ],
    monthNames = [
        'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ],
    hydrologyKeys = Object.freeze({
        streamFlow: 'AvStreamFlow',
        surfaceRunoff: 'AvRunoff',
        subsurfaceFlow: 'AvGroundWater',
        pointSourceFlow: 'AvPtSrcFlow',
        evapotranspiration: 'AvEvapoTrans',
        precipitation: 'AvPrecipitation',
    }),
    tr55RunoffChartConfig = [
        {
            key: 'combined',
            name: 'Combined Hydrology',
            chartDiv: 'combined-hydrology-chart',
            seriesColors: ['#F8AA00', '#CF4300', '#C2D33C'],
            legendItems: [
                {
                    name: 'Evapotranspiration',
                    badgeId: 'evapotranspiration-badge',
                },
                {
                    name: 'Runoff',
                    badgeId: 'runoff-badge',
                },
                {
                    name: 'Infiltration',
                    badgeId: 'infiltration-badge',
                },
            ],
            unit: 'LENGTH_S',
            unitLabel: 'Level',
        },
        {
            key: 'et',
            name: 'Evapotranspiration',
            chartDiv: 'evapotranspiration-chart',
            seriesColors: ['#C2D33C'],
            legendItems: null,
            unit: 'LENGTH_S',
            unitLabel: 'Level',
        },
        {
            key: 'runoff',
            name: 'Runoff',
            chartDiv: 'runoff-chart',
            seriesColors: ['#CF4300'],
            legendItems: null,
            unit: 'LENGTH_S',
            unitLabel: 'Level',
        },
        {
            key: 'inf',
            name: 'Infiltration',
            chartDiv: 'infiltration-chart',
            seriesColors: ['#F8AA00'],
            legendItems: null,
            unit: 'LENGTH_S',
            unitLabel: 'Level',
        }
    ],
    tr55QualityChartConfig = [
        {
            name: 'Total Suspended Solids',
            chartDiv: 'tss-chart',
            seriesColors: ['#389b9b'],
            legendItems: null,
            unit: 'MASSPERAREA_M',
            unitLabel: 'Loading Rate',
        },
        {
            name: 'Total Nitrogen',
            chartDiv: 'tn-chart',
            seriesColors: ['#389b9b'],
            legendItems: null,
            unit: 'MASSPERAREA_M',
            unitLabel: 'Loading Rate',
        },
        {
            name: 'Total Phosphorus',
            chartDiv: 'tp-chart',
            seriesColors: ['#389b9b'],
            legendItems: null,
            unit: 'MASSPERAREA_M',
            unitLabel: 'Loading Rate',
        }
    ],
    gwlfeHydrologySelectionOptionConfig = [
        { groupName: 'Water Flow', name: 'Stream Flow', value: hydrologyKeys.streamFlow, active: true },
        { groupName: 'Water Flow', name: 'Surface Runoff', value: hydrologyKeys.surfaceRunoff },
        { groupName: 'Water Flow', name: 'Subsurface Flow', value: hydrologyKeys.subsurfaceFlow },
        { groupName: 'Water Flow', name: 'Point Source Flow', value: hydrologyKeys.pointSourceFlow },
        { groupName: 'Water Flow', name: 'Evapotranspiration', value: hydrologyKeys.evapotranspiration },
        { groupName: 'Water Flow', name: 'Precipitation', value: hydrologyKeys.precipitation },
    ],
    gwlfeQualityChartConfig = [
        {
            name: 'Sediment',
            key: 'Sediment',
            chartDiv: 's-chart',
            unit: 'MASS_M',
        },
        {
            name: 'Total Nitrogen',
            key: 'TotalN',
            chartDiv: 'tn-chart',
            unit: 'MASS_M',
        },
        {
            name: 'Total Phosphorus',
            key: 'TotalP',
            chartDiv: 'tp-chart',
            unit: 'MASS_M',
        }
    ],
    gwlfeQualitySelectionOptionConfig = [
        { group: 'SummaryLoads', groupName: 'Summary', name: 'Total Loads', unit: 'MASS_M', active: true },
        { group: 'SummaryLoads', groupName: 'Summary', name: 'Loading Rates', unit: 'MASSPERAREA_M' },
        { group: 'SummaryLoads', groupName: 'Summary', name: 'Mean Annual Concentration', unit: 'CONCENTRATION' },
        { group: 'SummaryLoads', groupName: 'Summary', name: 'Mean Low-Flow Concentration', unit: 'CONCENTRATION' },
        { group: 'Loads', groupName: 'Land Use', name: 'Hay/Pasture', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Cropland', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Wooded Areas', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Wetlands', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Open Land', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Barren Areas', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Low-Density Mixed', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Medium-Density Mixed', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'High-Density Mixed', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Low-Density Open Space', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Farm Animals', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Stream Bank Erosion', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Subsurface Flow', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Point Sources', unit: 'MASS_M' },
        { group: 'Loads', groupName: 'Land Use', name: 'Septic Systems', unit: 'MASS_M' },
    ];

module.exports = {
    SCENARIO_COLORS: SCENARIO_COLORS,
    monthNames: monthNames,
    hydrologyKeys: hydrologyKeys,
    tr55RunoffChartConfig: tr55RunoffChartConfig,
    tr55QualityChartConfig: tr55QualityChartConfig,
    gwlfeHydrologySelectionOptionConfig: gwlfeHydrologySelectionOptionConfig,
    gwlfeQualityChartConfig: gwlfeQualityChartConfig,
    gwlfeQualitySelectionOptionConfig: gwlfeQualitySelectionOptionConfig,
    CHARTS: CHARTS,
    TABLE: TABLE,
    MIN_VISIBLE_SCENARIOS: MIN_VISIBLE_SCENARIOS,
    CHART_AXIS_WIDTH: CHART_AXIS_WIDTH,
    COMPARE_COLUMN_WIDTH: COMPARE_COLUMN_WIDTH,
    HYDROLOGY: HYDROLOGY,
};
