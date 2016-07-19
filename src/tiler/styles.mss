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
  ::fill {
      polygon-fill: #ccc;
  }
}

@zoomBase: 0.5;

#drb_streams_50,
#nhdflowline
{
  line-color: #1562A9;
  [zoom<=10] { line-width: 1.0 * @zoomBase; }
  [zoom=11] { line-width: 2.0 * @zoomBase; }
  [zoom=12] { line-width: 4.0 * @zoomBase; }
  [zoom=13] { line-width: 6.0 * @zoomBase; }
  [zoom=14] { line-width: 8.0 * @zoomBase; }
  [zoom=15] { line-width: 10.0 * @zoomBase; }
  [zoom=16] { line-width: 12.0 * @zoomBase; }
  [zoom=17] { line-width: 14.0 * @zoomBase; }
  [zoom=18] { line-width: 16.0 * @zoomBase; }
}
