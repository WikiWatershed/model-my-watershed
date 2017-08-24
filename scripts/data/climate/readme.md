# Generating climate overlays
The scripts in this directory are used to preprocess climate rasters generate tiled pngs.

## Create RGBA color tiffs from climatology rasters

Source rasters for monthly means of precipitation and temperature have
been provided and can be found on the fileshare:

```
smb://fileshare.internal.azavea.com/projects/Stroud_ModelMyWatershed/data/rasters/PRISM_Climate
```

We need to generate tiled pyramids of all 24 rasters, but this requires an out of band
preprocessing step.  These steps assume you have `virtualenv` and `docker` installed on your system.

1. Extract all source rasters to the root of `./source/`
2. Create a virtualenv

```bash
virtualenv env
```

3. Activate virtualenv and upgrade pip

```bash
source env/bin/activate
pip install pip --upgrade
```

4. Install script dependencies

```bash
pip install -r requirements.txt
```

5. Run the script, it assumes sources are in `./source`

```bash
python colorize.py
```

6. Check `./output` and verify all 24 climate rasters have had a color version generated.  You can spot check against:
* http://data.nanoos.org/files/cz/mapoverlays/ppt_01.png
* http://data.nanoos.org/files/cz/mapoverlays/tmean_01.png

## Tiling the rasters
The tiling steps make use of a forked version of the standard `gdal2tiles.py` script, both adding multiprocessing support and a ZXY tiling scheme (in addition to the standard TMS).  Download the forked version from [here](https://raw.githubusercontent.com/roblabs/gdal2tilesp/master/gdal2tilesp.py) to the root of this directory.

1. Run the tile script

```bash
python tile.py
```

2. After some time, each variable + month will have a directory in `./output/tiles` in the standard ZXY format.
