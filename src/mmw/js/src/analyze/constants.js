"use strict";

var constants = {
    csvColumnMaps: {
        nlcd: {
            'nlcd': 'nlcd_id',
            'area': 'area_sq_m',
            'coverage': 'coverage_pct',
        },
        soil: {
            'code': 'soil_code',
            'area': 'area_sq_m',
            'coverage': 'coverage_pct'
        },
        animals: {
            'aeu': 'animal_count',
            'type': 'animal_type'
        },
        pointSource: {
            'kgp_yr': 'phosphorus_load_kg_per_yr',
            'mgd': 'discharge_million_gallon_per_day',
            'kgn_yr': 'nitrogen_load_kg_per_yr'
        },
        waterQuality: {
            'nord': 'nord',
            'areaha': 'area_hectares',
            'tss_tot_kg': 'total_suspended_solids_kg_yr_per_ha',
            'tp_tot_kgy': 'total_phosphorus_kg_yr_per_ha',
            'tn_tot_kgy': 'total_nitrogen_kg_yr_per_ha',
            'tss_urban_': 'total_suspended_solids_urban_kg_yr_per_ha',
            'tp_urban_k': 'total_phosphorus_urban_kg_yr_per_ha',
            'tn_urban_k': 'total_nitrogen_urban_kg_yr_per_ha',
            'tss_rip_kg': 'total_suspended_solids_riparian_kg_yr_per_ha',
            'tn_riparia': 'total_nitrogen_riparian_kg_yr_per_ha',
            'tp_riparia': 'total_phosphorus_riparian_kg_yr_per_ha',
            'tp_pt_kgyr': 'total_phosphorus_point_source_kg_yr_per_ha',
            'tn_pt_kgyr': 'total_nitrogen_point_source_kg_yr_per_ha',
            'tss_natura': 'total_suspended_solids_natural_kg_yr_per_ha',
            'tn_natural': 'total_nitrogen_natural_kg_yr_per_ha',
            'tp_natural': 'total_phosphorus_natural_kg_yr_per_ha',
            'tss_ag_kgy': 'total_suspended_solids_agricultural_kg_yr_per_ha',
            'tn_ag_kgyr': 'total_nitrogen_agricultural_kg_yr_per_ha',
            'tp_ag_kgyr': 'total_phosphorus_agricultural_kg_yr_per_ha',
            'tss_concmg': 'total_suspended_solids_concentration_mg_per_l',
            'tp_yr_avg_': 'total_phosphorus_concentration_mg_per_l',
            'tn_yr_avg_': 'total_nitrogen_concentration_mg_per_l'
        }
    }
};

module.exports = constants;
