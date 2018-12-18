"use strict";

var settings = require('./settings');

var units = {
    UNIT_SCHEME: {
        METRIC: 'METRIC',
        USCUSTOMARY: 'USCUSTOMARY',
    },
    USCUSTOMARY: {
        AREA_XL: {
            name: 'mi²',
            factor: 2.58999E+06,
            offset: 0
        },
        AREA_L_FROM_HA: { // Used for converting ha values
            name: 'acre',
            factor: 4.04686E-01,
            offset: 0
        },
        AREA_L: {
            name: 'acre',
            factor: 4.04686E+03,
            offset: 0
        },
        AREA_M: {
            name: 'ft²',
            factor: 9.29030E-02,
            offset: 0
        },
        LENGTH_XL_FROM_KM: {
            name: 'mi',
            factor: 1.60934,
            offset: 0
        },
        LENGTH_XL: {
            name: 'mi',
            factor: 1.60934E+03,
            offset: 0
        },
        LENGTH_M: {
            name: 'ft',
            factor: 3.04800E-01,
            offset: 0
        },
        LENGTH_S: {
            name: 'in',
            factor: 2.54000E-02,
            offset: 0
        },
        TEMPERATURE: {
            name: '°F',
            factor: 5.55556E-01,
            offset: 32
        },
        MASS_M: {
            name: 'lb',
            factor: 4.53592E-01,
            offset: 0
        },
        MASSPERAREA_L: {
            name: 'ton/ac', // US short ton
            factor: 2.24170E+03, // from kg/ha
            offset: 0
        },
        MASSPERAREA_M: {
            name: 'lb/ac',
            factor: 1.12085,
            offset: 0
        },
        MASSPERTIME: {
            name: 'lb/yr',
            factor: 1/2.204620532,
            offset: 0
        },
        VOLUMETRICFLOWRATE: {
            name: 'mgd',
            factor: 1,
            offset: 0
        },
        CONCENTRATION: {
            name: 'mg/L',
            factor: 1,
            offset: 0
        },
        VOLUME: {
            name: 'ft³',
            factor: 2.83168E-02,
            offset: 0
        },
    },
    METRIC: {
        AREA_XL: {
            name: 'km²',
            factor: 1.00000E+06,
            offset: 0
        },
        AREA_L_FROM_HA: {
            name: 'ha',
            factor: 1,
            offset: 0
        },
        AREA_L: {
            name: 'ha',
            factor: 1.00000E+04,
            offset: 0
        },
        AREA_M: {
            name: 'm²',
            factor: 1,
            offset: 0
        },
        LENGTH_XL_FROM_KM: {
            name: 'km',
            factor: 1,
            offset: 0
        },
        LENGTH_XL: {
            name: 'km',
            factor: 1.00000E+03,
            offset: 0
        },
        LENGTH_M: {
            name: 'm',
            factor: 1,
            offset: 0
        },
        LENGTH_S: {
            name: 'cm',
            factor: 1.00000E-02,
            offset: 0
        },
        TEMPERATURE: {
            name: '°C',
            factor: 1,
            offset: 0
        },
        MASS_M: {
            name: 'kg',
            factor: 1,
            offset: 0
        },
        MASSPERAREA_L: { // both MASSPERAREA are kg/ha in METRIC
            name: 'kg/ha',
            factor: 1,
            offset: 0
        },
        MASSPERAREA_M: {
            name: 'kg/ha',
            factor: 1,
            offset: 0
        },
        MASSPERTIME: {
            name: 'kg/yr',
            factor: 1,
            offset: 0
        },
        VOLUMETRICFLOWRATE: {
            name: 'm³/d',
            factor: 1/3785.411784,
            offset: 0
        },
        CONCENTRATION: {
            name: 'mg/L',
            factor: 1,
            offset: 0
        },
        VOLUME: {
            name: 'm³',
            factor: 1,
            offset: 0
        },
    },
    get: function(unit, value) {
        var scheme = settings.get('unit_scheme');

        return {
            unit: this[scheme][unit].name,
            value: value /
                this[scheme][unit].factor +
                this[scheme][unit].offset,
        };
    },
    CONVERSIONS: {
        CM_PER_IN: 2.54,
    },
};

module.exports = units;
