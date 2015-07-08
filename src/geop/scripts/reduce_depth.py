#!/usr/bin/env python
from __future__ import print_function
from __future__ import unicode_literals
from __future__ import division

import numpy
import rasterio
import argparse
import re
import pprint

if __name__ == '__main__':
    description = """
    Given a single-band GeoTiff and a mapping between the native
    alphabet and a reduced alphabet encoding only values of concern,
    this program produces a much smaller GeoTiff.
    """

    parser = argparse.ArgumentParser(description=description)
    parser.add_argument('infile', type=str, help='The name of the input file')
    parser.add_argument('into', type=str, help='The name of the mapping file')
    parser.add_argument('outfile', type=str, help='Output file name')
    args = parser.parse_args()

    with rasterio.drivers():

        # input geotiff
        with rasterio.open(args.infile) as src:
            meta = src.meta.copy()
            in_band = src.read(1)
        pprint.pprint(meta)

        # mapping
        into_dict = {}
        for line in open(args.into, "r"):
            word, soil = re.split(",\s*", line)
            word = int(word)
            soil = int(soil)
            into_dict[word] = soil

        def scaler_into(value):
            return into_dict[value]

        vector_into = numpy.vectorize(scaler_into)

        # describe, prepare output
        kwargs = meta
        kwargs.update(dtype=rasterio.uint8, nodata=0, compress='lzw')
        out_band = vector_into(in_band)

        # write output
        with rasterio.open(args.outfile, 'w', **kwargs) as dst:
            dst.write_band(1, out_band.astype(rasterio.uint8))
