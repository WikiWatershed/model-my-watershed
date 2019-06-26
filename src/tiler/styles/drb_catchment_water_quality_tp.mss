#drb_catchment_water_quality_tp {
    line-color: @drb_catchment_line_color;
    line-width: @drb_catchment_line_width;
    [tp_tot_kgy >= 0.0][tp_tot_kgy < 0.30] {
        polygon-fill: @drb_catchment_step_one_color;
    }
    [tp_tot_kgy >= 0.30][tp_tot_kgy < 0.60] {
        polygon-fill: @drb_catchment_step_two_color;
    }
    [tp_tot_kgy >= 0.60][tp_tot_kgy < 0.90] {
        polygon-fill: @drb_catchment_step_three_color;
    }
    [tp_tot_kgy >= 0.90][tp_tot_kgy < 1.20] {
        polygon-fill: @drb_catchment_step_four_color;
    }
    [tp_tot_kgy >= 1.20] {
        polygon-fill: @drb_catchment_step_five_color;
    }
}
