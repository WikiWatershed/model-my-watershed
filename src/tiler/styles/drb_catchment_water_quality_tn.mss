#drb_catchment_water_quality_tn {
    line-color: @drb_catchment_line_color;
    line-width: @drb_catchment_line_width;
    [tn_tot_kgy >= 0][tn_tot_kgy < 5] {
        polygon-fill: @drb_catchment_step_one_color;
    }
    [tn_tot_kgy >= 5][tn_tot_kgy < 10] {
        polygon-fill: @drb_catchment_step_two_color;
    }
    [tn_tot_kgy >= 10][tn_tot_kgy < 15] {
        polygon-fill: @drb_catchment_step_three_color;
    }
    [tn_tot_kgy >= 15][tn_tot_kgy < 20] {
        polygon-fill: @drb_catchment_step_four_color;
    }
    [tn_tot_kgy >= 20] {
        polygon-fill: @drb_catchment_step_five_color;
    }
}
