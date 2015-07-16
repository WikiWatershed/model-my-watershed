#modeling_district {
  polygon-fill: #FF0000;
  polygon-opacity: 0.0;
  line-color: #000;
  line-opacity: 0.618;
}

@zoomBase: 0.3;

#deldem4net20r,
#deldem4net50r,
#deldem4net100r,
{
  line-color: #78CAE6;
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
