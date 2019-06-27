#drb_catchment_water_quality_tss {
    line-color: @drb_catchment_line_color;
    line-width: @drb_catchment_line_width;
    [tss_tot_kg >= 0][tss_tot_kg < 250] {
        polygon-fill: @drb_catchment_step_one_color;
    }
    [tss_tot_kg >= 250][tss_tot_kg < 500] {
        polygon-fill: @drb_catchment_step_two_color;
    }
    [tss_tot_kg >= 500][tss_tot_kg < 750] {
        polygon-fill: @drb_catchment_step_three_color;
    }
    [tss_tot_kg >= 750][tss_tot_kg < 1000] {
        polygon-fill: @drb_catchment_step_four_color;
    }
    [tss_tot_kg >= 1000] {
        polygon-fill: @drb_catchment_step_five_color;
    }
}
