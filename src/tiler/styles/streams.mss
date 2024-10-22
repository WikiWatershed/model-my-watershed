/* DRB and NHD Streams have custom SQL which is executed for tile requests
   that is dynamically generated from the requested zoom level.  This filters
   stream features out below a certain threshold of stream_order per zoom level.
   Ensure that any changes to which stream_order + zoom levels are rendered
   here have appropriate coinciding filters in server.js
*/

// Any updates to colors should also be made in _variables.scss
@streamColor: #1562A9;

#nhdflowline {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
}

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
    line-width: 3.0 * @zoomBase;
  }
}

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

#nhdflowlinehr {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
}

#nhdflowlinehr[zoom<=4] {
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

#nhdflowlinehr[zoom>=5][zoom<=6] {
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

#nhdflowlinehr[zoom>=9][zoom<=10] {
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

#nhdflowlinehr[zoom>=11][zoom<=12] {
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

#nhdflowlinehr[zoom>=13] {
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

#drb_streams_50 {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
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

#tdxstreams {
  line-color: @streamColor;
  line-join: round;
  line-cap: round;
}

#tdxstreams[zoom<=4] {
  [stream_order=8] {
    line-width: 2.0;
  }
  [stream_order=7] {
    line-width: 1.0;
  }
  [stream_order=6] {
    line-width: 0.5;
  }
}

#tdxstreams[zoom>=5][zoom<=6] {
  [stream_order=8] {
    line-width: 3.0;
  }
  [stream_order=7] {
    line-width: 2.0;
  }
  [stream_order=6] {
    line-width: 1.0;
  }
  [stream_order=5] {
    line-width: 0.5;
  }
}

#tdxstreams[zoom>=7][zoom<=8] {
  [stream_order=8] {
    line-width: 4.0;
  }
  [stream_order=7] {
    line-width: 3.0;
  }
  [stream_order=6] {
    line-width: 2.0;
  }
  [stream_order=5] {
    line-width: 1.0;
  }
  [stream_order=4] {
    line-width: 0.5;
  }
}

#tdxstreams[zoom>=9][zoom<=10] {
  [stream_order=8] {
    line-width: 5.0;
  }
  [stream_order=7] {
    line-width: 4.0;
  }
  [stream_order=6] {
    line-width: 3.0;
  }
  [stream_order=5] {
    line-width: 2.0;
  }
  [stream_order=4] {
    line-width: 1.0;
  }
  [stream_order=3] {
    line-width: 0.5;
  }
}

#tdxstreams[zoom>10][zoom<=11] {
  [stream_order=8] {
    line-width: 6.0;
  }
  [stream_order=7] {
    line-width: 5.0;
  }
  [stream_order=6] {
    line-width: 4.0;
  }
  [stream_order=5] {
    line-width: 3.0;
  }
  [stream_order=4] {
    line-width: 2.0;
  }
  [stream_order=3] {
    line-width: 1.0;
  }
  [stream_order=2] {
    line-width: 0.5;
  }
}

#tdxstreams[zoom>=12] {
  [stream_order=8] {
    line-width: 7.0;
  }
  [stream_order=7] {
    line-width: 6.0;
  }
  [stream_order=6] {
    line-width: 5.0;
  }
  [stream_order=5] {
    line-width: 4.0;
  }
  [stream_order=4] {
    line-width: 3.0;
  }
  [stream_order=3] {
    line-width: 2.0;
  }
  [stream_order=2] {
    line-width: 1.0;
  }
  [stream_order=1] {
    line-width: 0.5;
  }
}
