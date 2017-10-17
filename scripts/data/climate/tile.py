import os
import subprocess
import sys

from glob import glob


def mkdirp(dir):
    try:
        os.makedirs(dir)
    except:
        pass


def generate_tiles():
    mkdirp('./output/tiles')

    files = glob('./output/*.tif')

    for file in files:
        # Extract just the data_month portion of the file
        start = 9
        end = file.find('_color.tif')
        dataset = file[start:end]

        # Create a subdirectory for this dataset
        out_dir = './output/tiles/{}'.format(dataset)
        mkdirp(out_dir)

        # Generate the tiles
        print '******\n{}\n******'.format(dataset)
        cmd = 'docker run -t -i --rm  -v $(pwd):/data geodata/gdal:2.1.3 \
                 python gdal2tilesp.py \
                 -w none \
                 -z "0-6" \
                 -o xyz \
                 {} \
                 {}'.format(file, out_dir)

        subprocess.call(cmd, shell=True)


if __name__ == '__main__':
    msg = """
    Expects monthly climate (PPT, tmean) RGBA rasters in ./output and generates
    a pyramid of png tiles for each, in ./output/tiles
    """

    if len(sys.argv) > 1:
        print('\nUsage:', msg)
        sys.exit()

    generate_tiles()
