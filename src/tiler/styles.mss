/* CONSIDER THAT CHANGES TO THESE STYLES WILL MAKE THE   */
/* TILE CACHE STALE. PLEASE USE setupdb.sh TO INVALIDATE */
/* THE LAYERS IMPACTED BY YOUR CHANGES.                  */

#boundary_county,
#boundary_district,
#boundary_school_district,
#boundary_huc08,
#boundary_huc10,
#boundary_huc12,
#dep_municipalities {
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

#dep_urban_areas {
  ::case {
      line-color: #7F7F7F;
      line-width: 1;
  }
  ::fill {
      polygon-fill: #ccc;
  }
}

@streamColor: #1562A9;
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

#drb_streams_50[zoom<=4],
#nhdflowline[zoom<=4] {
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

#drb_streams_50[zoom>=5][zoom<=6],
#nhdflowline[zoom>=5][zoom<=6] {
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

#drb_streams_50[zoom>=7][zoom<=8],
#nhdflowline[zoom>=7][zoom<=8] {
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

#drb_streams_50[zoom>=9][zoom<=10],
#nhdflowline[zoom>=9][zoom<=10] {
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
    line-width: 4.0 * @zoomBase;
  }
}

#drb_streams_50[zoom>=11][zoom<=12],
#nhdflowline[zoom>=11][zoom<=12] {
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


#drb_streams_50[zoom>=13],
#nhdflowline[zoom>=13] {
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
