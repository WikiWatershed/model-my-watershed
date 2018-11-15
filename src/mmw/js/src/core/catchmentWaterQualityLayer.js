"use strict";

var L = require('leaflet'),
    utils = require('./utils'),
    Backbone = require('../../shim/backbone'),
    Marionette = require('../../shim/backbone.marionette'),
    coreUnits = require('./units'),
    catchmentWaterQualityPopupTmpl = require('./templates/catchmentWaterQualityPopup.html');

var Layer = {
    createLayer: function(geojsonFeatureCollection) {
        return L.geoJson(JSON.parse(geojsonFeatureCollection), {
            onEachFeature: function(feature, catchmentPolygon) {
                var model = new Backbone.Model(feature.properties),
                    view = new CatchmentWaterQualityPopupView({ model: model });
                catchmentPolygon.bindPopup(view.render().el);
            },
        });
    }
};

var CatchmentWaterQualityPopupView = Marionette.ItemView.extend({
    template: catchmentWaterQualityPopupTmpl,
    className: 'catchment-water-quality-popup',

    templateHelpers: function() {
        var tn_ag_kgyr = coreUnits.get('MASSPERAREA_M', this.model.get('tn_ag_kgyr')),
            tp_ag_kgyr = coreUnits.get('MASSPERAREA_M', this.model.get('tp_ag_kgyr')),
            tn_natural = coreUnits.get('MASSPERAREA_M', this.model.get('tn_natural')),
            tp_natural = coreUnits.get('MASSPERAREA_M', this.model.get('tp_natural')),
            tn_pt_kgyr = coreUnits.get('MASSPERAREA_M', this.model.get('tn_pt_kgyr')),
            tp_pt_kgyr = coreUnits.get('MASSPERAREA_M', this.model.get('tp_pt_kgyr')),
            tn_riparia = coreUnits.get('MASSPERAREA_M', this.model.get('tn_riparia')),
            tp_riparia = coreUnits.get('MASSPERAREA_M', this.model.get('tp_riparia')),
            tn_urban_k = coreUnits.get('MASSPERAREA_M', this.model.get('tn_urban_k')),
            tp_urban_k = coreUnits.get('MASSPERAREA_M', this.model.get('tp_urban_k')),
            tss_ag_kgy = coreUnits.get('MASSPERAREA_L', this.model.get('tss_ag_kgy')),
            tss_natura = coreUnits.get('MASSPERAREA_L', this.model.get('tss_natura')),
            tss_rip_kg = coreUnits.get('MASSPERAREA_L', this.model.get('tss_rip_kg')),
            tss_urban_ = coreUnits.get('MASSPERAREA_L', this.model.get('tss_urban_'));

        return {
            massPerAreaMUnit: tn_ag_kgyr.unit,
            massPerAreaLUnit: tss_ag_kgy.unit,
            tn_ag_kgyr: tn_ag_kgyr.value,
            tp_ag_kgyr: tp_ag_kgyr.value,
            tn_natural: tn_natural.value,
            tp_natural: tp_natural.value,
            tn_pt_kgyr: tn_pt_kgyr.value,
            tp_pt_kgyr: tp_pt_kgyr.value,
            tn_riparia: tn_riparia.value,
            tp_riparia: tp_riparia.value,
            tn_urban_k: tn_urban_k.value,
            tp_urban_k: tp_urban_k.value,
            tss_ag_kgy: tss_ag_kgy.value,
            tss_natura: tss_natura.value,
            tss_rip_kg: tss_rip_kg.value,
            tss_urban_: tss_urban_.value,
            noData: utils.noData
        };
    }
});

module.exports.Layer = Layer;
module.exports.CatchmentWaterQualityPopupView = CatchmentWaterQualityPopupView;
