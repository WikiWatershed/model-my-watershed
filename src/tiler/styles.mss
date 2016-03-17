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

@zoomBase: 0.5;

#drb_stream_network_20,
#drb_stream_network_50,
#drb_stream_network_100,
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
