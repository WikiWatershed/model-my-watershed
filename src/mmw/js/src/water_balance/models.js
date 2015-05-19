"use strict";

var WaterBalanceModel = {
    landMap: {
        '21': 'turfGrass',
        '22': 'lir',
        '23': 'hir',
        '24': 'commercial',
        '41': 'forest',
        '71': 'grassland',
        '81': 'pasture',
        '82': 'rowCrops',
        // TODO The following are missing NLCD identifiers.
        // Replace X? with actual numbers when that data is available.
        'X0': 'chaparral',
        'X1': 'tallGrass',
        'X2': 'shortGrass',
        'X3': 'desert'
    },

    soilMap: [
        'sand',
        'loam',
        'sandyClay',
        'clayLoam'
    ],

    populateModel: function(data) {
        var model = {};
        var lines = data.split(/\n/);

        for (var j = 1; j < lines.length; j++) {
            var line = lines[j].split(',');
            var soil = this.soilMap[line[2]];
            var land = this.landMap[line[1]];
            var precip = line[0];

            if (soil && land && precip) {
                if (!(soil in model))
                    model[soil] = {};
                if (!(land in model[soil]))
                    model[soil][land] = {};

                model[soil][land][precip] = {
                    'et': line[3],
                    'i' : line[4],
                    'r' : line[5]
                };
            }
        }

        return model;
    }
};

module.exports = {
    WaterBalanceModel: WaterBalanceModel
};
