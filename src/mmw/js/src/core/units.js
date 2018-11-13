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
    },
    METRIC: {
        AREA_XL: {
            name: 'km²',
            factor: 1.00000E+06,
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
};

module.exports = units;
