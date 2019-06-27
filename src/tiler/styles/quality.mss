@wtrQualColor0: #1a9641;
@wtrQualColor1: #a6d96a;
@wtrQualColor2: #ffffbf;
@wtrQualColor3: #fdae61;
@wtrQualColor4: #d7191c;
@wtrQualColorNA: #9E9E9E;

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
