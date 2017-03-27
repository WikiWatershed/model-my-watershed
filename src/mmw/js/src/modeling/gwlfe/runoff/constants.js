"use strict";

var constants = {
    hydrologyCSVColumnMap: {
        'AvWithdrawal': 'avg_withdrawal_cm',
        'AvEvapoTrans': 'avg_evapotranspiration_cm',
        'AvTileDrain': 'avg_tile_drain_cm',
        'AvPrecipitation': 'avg_precipitation_cm',
        'AvRunoff': 'avg_runoff_cm',
        'AvGroundWater': 'avg_groundwater_cm',
        'AvPtSrcFlow': 'avg_pointsource_flow_cm',
        'AvStreamFlow': 'avg_stream_flow_cm'
    }
};

module.exports = constants;
