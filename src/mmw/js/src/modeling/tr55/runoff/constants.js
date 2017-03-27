"use strict";

var constants = {
    tr55RunoffCSVColumnMap: function(v, k) {
        switch (k) {
            case 'et':
                return ['evapotranspiration_cm', v];
            case 'inf':
                return ['infiltration_cm', v];
            case 'runoff':
                return ['runoff_cm', v];
            default:
                return [k, v];
        }
    }
};

module.exports = constants;
