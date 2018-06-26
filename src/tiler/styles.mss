/* CONSIDER THAT CHANGES TO THESE STYLES WILL MAKE THE   */
/* TILE CACHE STALE. PLEASE USE setupdb.sh TO INVALIDATE */
/* THE LAYERS IMPACTED BY YOUR CHANGES.                  */

#boundary_county,
#boundary_district,
#boundary_school_district,
#boundary_huc08,
#boundary_huc10,
#boundary_huc12 {
  ::case {
   line-color: #FFF;
   line-opacity: 0.5;
   line-width: 3;
   line-join: round;
  }

  ::fill  {
    polygon-opacity: 0.0;
    line-color: #E77471;
    line-opacity: 0.75;
    line-width: 1.5;
    line-join: round;
  }
}

#dep_municipalities {
  ::case {
   line-color: #FFF;
   line-opacity: 0.5;
   line-width: 3;
   line-join: round;
  }

  ::fill  {
    polygon-opacity: 0.0;
    line-color: #1d3331;
    line-opacity: 0.75;
    line-width: 1.5;
    line-join: round;
  }
}

#dep_urban_areas {
  ::case {
      line-color: #7F7F7F;
      line-width: 1;
  }
  ::fill {
      polygon-fill: #ccc;
  }
}

// Updates to steps should also be made to the legend_mappings
// in mmw/settings/layer_settings
// Any updates to colors must also be made in _variables.scss
@drb_catchment_step_one_color: #A0A0A0;
@drb_catchment_step_two_color: #888888;
@drb_catchment_step_three_color: #707070;
@drb_catchment_step_four_color: #484848;
@drb_catchment_step_five_color: #202020;
@drb_catchment_line_color: #FFF;
@drb_catchment_line_width: 2;

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

// Any updates to colors should also be made in _variables.scss
@streamColor: #1562A9;
@wtrQualColor0: #1a9641;
@wtrQualColor1: #a6d96a;
@wtrQualColor2: #ffffbf;
@wtrQualColor3: #fdae61;
@wtrQualColor4: #d7191c;
@wtrQualColorNA: #9E9E9E;

@zoomBase: 0.5;

/* DRB and NHD Streams have custom SQL which is executed for tile requests
   that is dynamically generated from the requested zoom level.  This filters
   stream features out below a certain threshold of stream_order per zoom level.
   Ensure that any changes to which stream_order + zoom levels are rendered
   here have appropriate coinciding filters in server.js
*/

#drb_streams_50 {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
}

#nhdflowline {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
}

#nhd_quality_tp,
#nhd_quality_tn,
#nhd_quality_tss {
  [nhd_qual_grp="L1"] {
    line-color: @wtrQualColor0;
  }
  [nhd_qual_grp="L2"] {
    line-color: @wtrQualColor1;
  }
  [nhd_qual_grp="L3"] {
    line-color: @wtrQualColor2;
  }
  [nhd_qual_grp="L4"] {
    line-color: @wtrQualColor3;
  }
  [nhd_qual_grp="L5"] {
    line-color: @wtrQualColor4;
  }
  [nhd_qual_grp="NA"] {
    line-color: @wtrQualColorNA;
  }
}


#nhdflowline[zoom<=4],
#nhd_quality_tp[zoom<=4],
#nhd_quality_tn[zoom<=4],
#nhd_quality_tss[zoom<=4] {
  [stream_order=10] {
    line-width: 5.0 * @zoomBase;
  }
  [stream_order=9] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order<=8] {
    line-width: 2.0 * @zoomBase;
  }
}


#nhdflowline[zoom>=5][zoom<=6],
#nhd_quality_tp[zoom>=5][zoom<=6],
#nhd_quality_tn[zoom>=5][zoom<=6],
#nhd_quality_tss[zoom>=5][zoom<=6] {
  [stream_order=10] {
    line-width: 7.0 * @zoomBase;
  }
  [stream_order=9] {
    line-width: 4.0 * @zoomBase;
  }
  [stream_order<=8] {
    line-width: 3.0 * @zoomBase;
  }
}


#nhdflowline[zoom>=7][zoom<=8],
#nhd_quality_tp[zoom>=7][zoom<=8],
#nhd_quality_tn[zoom>=7][zoom<=8],
#nhd_quality_tss[zoom>=7][zoom<=8] {
  [stream_order>=9] {
    line-width: 10.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=7] {
    line-width: 7.0 * @zoomBase;
  }
  [stream_order<=6] {
    line-width: 4.0 * @zoomBase;
  }
  [stream_order=5] {
    line-width: 3.0 * @zoomBase;
  }
}


#nhdflowline[zoom>=9][zoom<=10],
#nhd_quality_tp[zoom>=9][zoom<=10],
#nhd_quality_tn[zoom>=9][zoom<=10],
#nhd_quality_tss[zoom>=9][zoom<=10] {
  [stream_order>=9] {
    line-width: 14.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 10.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=4] {
    line-width: 5.0 * @zoomBase;
  }
  [stream_order=3] {
    line-width: 3.0 * @zoomBase;
  }
}


#nhdflowline[zoom>=11][zoom<=12],
#nhd_quality_tp[zoom>=11][zoom<=12],
#nhd_quality_tn[zoom>=11][zoom<=12],
#nhd_quality_tss[zoom>=11][zoom<=12] {
  [stream_order>=9] {
    line-width: 18.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 12.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=4] {
    line-width:  9.0 * @zoomBase;
  }
  [stream_order=3] {
    line-width:  6.0 * @zoomBase;
  }
  [stream_order=2] {
    line-width:  5.0 * @zoomBase;
  }
  [stream_order<=1][stream_order>=0] {
    line-width:  4.0 * @zoomBase;
  }
}



#nhdflowline[zoom>=13],
#nhd_quality_tp[zoom>=13],
#nhd_quality_tn[zoom>=13],
#nhd_quality_tss[zoom>=13] {
  [stream_order>=9] {
    line-width: 18.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 14.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=3] {
    line-width:  10.0 * @zoomBase;
  }
  [stream_order=2] {
    line-width:  8.0 * @zoomBase;
  }
  [stream_order<=1][stream_order>=0] {
    line-width:  5.0 * @zoomBase;
  }
}

#drb_streams_50[zoom<=4]{
  [stream_order=10] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order=9] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order<=8] {
    line-width: 2.0 * @zoomBase;
  }
}

#drb_streams_50[zoom>=5][zoom<=6]{
  [stream_order=10] {
    line-width: 4.0 * @zoomBase;
  }
  [stream_order=9] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order<=8] {
    line-width: 2.0 * @zoomBase;
  }
}

#drb_streams_50[zoom>=7][zoom<=8]{
  [stream_order>=9] {
    line-width: 7.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=7] {
    line-width: 4.0 * @zoomBase;
  }
  [stream_order<=6] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order=5] {
    line-width: 2.0 * @zoomBase;
  }
}

#drb_streams_50[zoom>=9][zoom<=10]{
  [stream_order>=9] {
    line-width: 10.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 5.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=4] {
    line-width: 3.0 * @zoomBase;
  }
  [stream_order=3] {
    line-width: 2.0 * @zoomBase;
  }
}

#drb_streams_50[zoom>=11][zoom<=12] {
  [stream_order>=9] {
    line-width: 12.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 10.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=4] {
    line-width:  6.0 * @zoomBase;
  }
  [stream_order=3] {
    line-width:  5.0 * @zoomBase;
  }
  [stream_order=2] {
    line-width:  4.0 * @zoomBase;
  }
  [stream_order<=1][stream_order>=0] {
    line-width:  3.0 * @zoomBase;
  }
}
#drb_streams_50[zoom>=13]{
  [stream_order>=9] {
    line-width: 14.0 * @zoomBase;
  }
  [stream_order<=8][stream_order>=6] {
    line-width: 11.0 * @zoomBase;
  }
  [stream_order<=5][stream_order>=4] {
    line-width:  8.0 * @zoomBase;
  }
  [stream_order=3] {
    line-width:  5.0 * @zoomBase;
  }
  [stream_order=2] {
    line-width:  4.0 * @zoomBase;
  }
  [stream_order<=1][stream_order>=0] {
    line-width:  3.0 * @zoomBase;
  }
}
