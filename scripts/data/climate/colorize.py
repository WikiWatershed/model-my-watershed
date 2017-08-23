from __future__ import division
from __future__ import print_function

import os
import sys
import rasterio
import numpy as np
import matplotlib as mpl

from copy import copy

# These configuration settings were developed by staff at APL to produce
# visualizations consistent with their domain knowledge
datasets = {
    'tmean': {
        'colors': [(46, 0, 103), (141, 20, 255), (165, 15, 245),
                   (189, 10, 235), (213, 5, 225), (238, 0, 215),
                   (178, 8, 225), (119, 16, 235), (59, 25, 245),
                   (0, 34, 255), (0, 77, 199), (0, 121, 143),
                   (0, 164, 86), (0, 208, 31), (59, 211, 23),
                   (117, 214, 15), (176, 217, 7), (236, 221, 0),
                   (240, 165, 0), (245, 110, 2), (250, 55, 2),
                   (255, 0, 4), (87, 0, 16)],
        'position': [0., 0.16666667, 0.2, 0.23333333, 0.26666667,
                     0.3, 0.33333333, 0.36666667, 0.4, 0.43333333,
                     0.46666667, 0.5, 0.53333333, 0.56666667, 0.6,
                     0.63333333, 0.66666667, 0.7, 0.73333333, 0.76666667,
                     0.8, 0.83333333, 1.],
    },
    'ppt': {
        'colors': [(230, 111, 0),
                   (246, 155, 58),
                   (62, 178, 189),
                   (97, 212, 231),
                   (3, 116, 116),
                   (0, 49, 96)],
        'position': [0.0, 0.08, 0.16, 0.24, 0.32, 1.0],
    },
    'evi': {
        'colors': [(229, 229, 229), (182, 165, 134), (160, 138, 91),
                   (138, 111, 49), (140, 127, 43), (142, 143, 37),
                   (144, 159, 31), (146, 175, 25), (138, 177, 21),
                   (119, 165, 18), (99, 154, 15), (80, 142, 12),
                   (60, 131, 9), (41, 119, 6), (22, 108, 3),
                   (3, 97, 0), (0, 23, 0)],
        'position': [0, 0.04, 0.08, 0.12, 0.16, 0.20, 0.24, 0.28, 0.32, 0.36,
                     0.40, 0.44, 0.48, 0.52, 0.56, 0.60, 1],
    }
}


def make_cmap(colors, position=None, bit=False):
    """
    ** This code provided as is from:
    https://github.com/WikiWatershed/model-my-watershed/issues/2122
    **

    make_cmap takes a list of tuples which contain RGB values. The RGB
    values may either be in 8-bit [0 to 255] (in which bit must be set to
    True when called) or arithmetic [0 to 1] (default). make_cmap returns
    a cmap with equally spaced colors.
    Arrange your tuples so that the first color is the lowest value for the
    colorbar and the last is the highest.
    position contains values from 0 to 1 to dictate the location of each color.
    """
    bit_rgb = np.linspace(0, 1, 256)
    if position is None:
        position = np.linspace(0, 1, len(colors))
    else:
        if len(position) != len(colors):
            sys.exit("position length must be the same as colors")
        elif position[0] != 0 or position[-1] != 1:
            sys.exit("position must start with 0 and end with 1")
    if bit:
        for i in range(len(colors)):
            colors[i] = (bit_rgb[colors[i][0]],
                         bit_rgb[colors[i][1]],
                         bit_rgb[colors[i][2]])
    cdict = {'red': [], 'green': [], 'blue': []}
    for pos, color in zip(position, colors):
        cdict['red'].append((pos, color[0], color[0]))
        cdict['green'].append((pos, color[1], color[1]))
        cdict['blue'].append((pos, color[2], color[2]))

    cmap = mpl.colors.LinearSegmentedColormap('my_colormap', cdict, 256)
    return cmap


def normalize_to_rgba(var, arr, colormap):
    """
    ** This code was lightly edited for clarity and correctness from:
    https://github.com/WikiWatershed/model-my-watershed/issues/2122
    **

    Normalize raster values around display values ranges and convert
    to segmented linear interpolated rgba values for rendering
    """

    values = {
        'tmean': {
            'min': 0,
            'max': 60
        },
        'ppt': {
            'min': 0,
            'max': 500
        },
        'evi': {
            'min': 0,
            'max': 10000
        }
    }

    if var == 'tmean':
        arr = arr + 20
    else:
        arr = arr - values[var]['min']

    # Clean data layer of low or missing data
    cleaned_layer = np.ma.masked_where(arr < 0, arr)
    cleaned_layer = np.ma.masked_where(np.isnan(cleaned_layer), cleaned_layer)

    # Normalizing data to make it 0-1
    normed = cleaned_layer / float((values[var]['max'] - values[var]['min']))

    # Converting np array to rgba values of 0-255
    return colormap(normed, bytes=True)


def generate_color_rasters():
    for dataset in ['ppt', 'tmean']:

        # Create the colormap for this dataset
        colormap = make_cmap(datasets[dataset]['colors'],
                             datasets[dataset]['position'],
                             bit=True)

        for month in range(1, 13):
            month_str = str(month).zfill(2)
            input_file = './source/{}_{}.tif'.format(dataset, month_str)

            # Open all 12 rasters of this data set, one per month
            with rasterio.open(input_file, 'r') as src:
                arr = src.read(1)

                # Normalize the values and create an rgba value for
                # each cell
                img = normalize_to_rgba(dataset, arr, colormap)

                # We need to write out each rgba band separately, so
                # create 4 arrays of the same shape as the src
                # to contain them
                shp = arr.shape
                r = np.ndarray(shape=shp, dtype=np.uint8)
                g = np.ndarray(shape=shp, dtype=np.uint8)
                b = np.ndarray(shape=shp, dtype=np.uint8)
                a = np.ndarray(shape=shp, dtype=np.uint8)

                # Walk the rows and columns, extracting the rgba values
                # individualy but placed at the same index in the new array
                for i in range(0, shp[0]):
                    for j in range(0, shp[1]):
                        cell = img[i][j]
                        r[i][j] = cell[0]
                        g[i][j] = cell[1]
                        b[i][j] = cell[2]
                        a[i][j] = cell[3]

                # Copy the TIFF headers from the source file, but update to a
                # photometic rgba byte raster, the target for our output
                meta = copy(src.meta)
                meta.update({
                    'dtype': 'uint8',
                    'count': 4,
                    'photometric': 'rgb',
                    'nodata': None,
                    'alpha': 'YES'
                })

                # Write out the rgba raster, which is suitable for
                # tiling against gdal2tiles.py
                out = './output/{}_{}_color.tif'.format(dataset, month_str)
                with rasterio.open(out, 'w', **meta) as out:
                    out.write(r, 1)
                    out.write(g, 2)
                    out.write(b, 3)
                    out.write(a, 4)


if __name__ == '__main__':
    msg = """
    Expects monthly climate (PPT, tmean) raster in ./source and generates
    rgba tiffs that are suitable for tiling with gdal2tiles.py in ./output
    """

    if len(sys.argv) > 1:
        print('\nUsage:', msg)
        sys.exit()

    try:
        os.makedirs('output')
    except:
        pass

    generate_color_rasters()
