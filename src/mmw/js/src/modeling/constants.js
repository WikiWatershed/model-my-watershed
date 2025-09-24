"use strict";

module.exports = {
    GA: {
        MODEL_CATEGORY: "Modeling",
        MODEL_CREATE_EVENT: "project-create",
        MODEL_SCENARIO_EVENT: "scenario-create",
        MODEL_MOD_EVENT: "-modification-create",
    },
    GWLFE_LAND_COVERS: [
        {id: 0, label: "Hay / Pasture"},
        {id: 1, label: "Cropland"},
        {id: 2, label: "Wooded Areas"},
        {id: 3, label: "Wetlands"},
        {id: 6, label: "Open Land"},
        {id: 7, label: "Barren Areas"},
        {id: 10, label: "Low-Density Mixed"},
        {id: 11, label: "Medium-Density Mixed"},
        {id: 12, label: "High-Density Mixed"},
        {id: 13, label: "Low-Density Open Space"},
    ],
    // In sync with apps.modeling.models.WeatherType
    WeatherType: {
        DEFAULT: 'DEFAULT',
        SIMULATION: 'SIMULATION',
        CUSTOM: 'CUSTOM',
    },
    // In sync with apps.modeling.models.WeatherType.simulations
    Simulations: [
        {
            group: 'Recent Weather',
            items: [
                {
                    name: 'NASA_NLDAS_2000_2019',
                    label: 'NASA NLDAS 2000-2019',
                },
            ],
            in_drwi: true,
            in_pa: true
        },
        {
            group: 'Future Weather Simulations',
            items: [
                {
                    name: 'RCP45_2080_2099',
                    label: 'RCP 4.5 2080-2099',
                },
                {
                    name: 'RCP85_2080_2099',
                    label: 'RCP 8.5 2080-2099',
                },
            ],
            in_drb: true,
        },
    ],
};
