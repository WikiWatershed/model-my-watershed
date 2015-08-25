"use strict";

var WaterBalanceModel = {
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

        function processLine(soil, land, precip) {
            if (!model[soil]) {
                model[soil] = {};
            }
            if (!model[soil][land]) {
                model[soil][land] = {};
            }
            model[soil][land][precip] = {
                'et': round(line[3]),
                'i' : round(line[4]),
                'r' : round(line[5])
            };
        }

        for (var j = 1; j < lines.length; j++) {
            var line = lines[j].split(',');
            var soil = this.soilMap[line[2]];
            var land = line[1];
            var precip = line[0];

            if (soil && land && precip) {
                processLine(soil, land, precip);
            }
        }

        return model;
    }
};

module.exports = {
    WaterBalanceModel: WaterBalanceModel
};
