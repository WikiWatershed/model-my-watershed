"use strict";

var WaterBalanceModel = {
    landMap: {
        'urban_grass': ['urban_grass'],
        'tall_grass_prairie': ['tall_grass_prairie'],
        'li_residential': ['li_residential'],
        'hi_residential': ['hi_residential'],
        'commercial': ['commercial'],
        'desert': ['desert'],
        'deciduous_forest': ['deciduous_forest'],
        'chaparral': ['chaparral'],
        'grassland': ['grassland'],
        'pasture': ['pasture'],
        'short_grass_prairie': ['short_grass_prairie'],
        'row_crop': ['row_crop']
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

        function round(x) {
            return Math.round(parseFloat(x) * 10) / 10;
        }

        function processLine(soil, lands, precip) {
            if (!model[soil]) {
                model[soil] = {};
            }
            lands.forEach(function(land) {
                if (!model[soil][land]) {
                    model[soil][land] = {};
                }
                model[soil][land][precip] = {
                    'et': round(line[3]),
                    'i' : round(line[4]),
                    'r' : round(line[5])
                };
            });
        }

        for (var j = 1; j < lines.length; j++) {
            var line = lines[j].split(',');
            var soil = this.soilMap[line[2]];
            var lands = this.landMap[line[1]];
            var precip = line[0];

            if (soil && lands && precip) {
                processLine(soil, lands, precip);
            }
        }

        return model;
    }
};

module.exports = {
    WaterBalanceModel: WaterBalanceModel
};
