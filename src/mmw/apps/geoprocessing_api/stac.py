from celery import shared_task
from django.core.cache import cache
from django.conf import settings
from pystac_client import Client
from rasterio.coords import BoundingBox
from rasterio.enums import Resampling
from rasterio.mask import mask
from rasterio.merge import merge
from rasterio.warp import (
    calculate_default_transform,
    transform_geom,
    reproject,
)
from shapely.geometry import box, mapping, shape
import json
import numpy as np
import os
import rasterio as rio
import tempfile


@shared_task
def query_histogram(geojson, url, collection, asset, filter, cachekey=''):
    # Check if cached and return that if possible
    stac_cachekey = ''
    if settings.GEOP['cache'] and cachekey:
        stac_cachekey = f'stac__{collection}_{cachekey}'
        cached = cache.get(stac_cachekey)
        if cached:
            return cached

    aoi = shape(json.loads(geojson))

    # Get list of intersecting tiffs from catalog
    client = Client.open(url)
    search = client.search(
        collections=collection,
        intersects=mapping(aoi),
        filter=filter,
    )
    tiffs = [item.assets[asset].href for item in search.items()]

    # Sort the tiffs, since the merging is order sensitive. We use the "first"
    # method, using the first image for overlapping pixels.
    tiffs = sorted(tiffs)

    # Raise error if no overlapping tiffs are found
    if not tiffs:
        return {
            'error': (
                f'No overlapping tiffs found in collection {collection} '
                f'with filter {filter} '
                f'with AoI {geojson[:255]} ...'
            )
        }

    # Find the Albers Equal Area CRS for this AoI
    dst_crs = get_albers_crs_for_aoi(aoi)

    # Reproject the tiffs and clip to the AoI to make tiles
    clips = []
    for tiff in tiffs:
        clip_data, clip_transform, clip_meta = clip_and_reproject_tile(
            tiff, aoi, dst_crs
        )
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix='.tif')
        with rio.open(temp_file.name, 'w', **clip_meta) as dst:
            dst.write(clip_data)
        clips.append(temp_file.name)

    # Merge the clipped rasters
    datasets = [rio.open(clip_path) for clip_path in clips]
    merged_data, merged_transform = merge(datasets, method='first')

    # Count how many of each class type there are
    values, counts = np.unique(merged_data, return_counts=True)
    histogram = list(zip(values.tolist(), counts.tolist()))

    # Ensure the result is JSON serializable
    histogram = {int(value): int(count) for value, count in histogram}

    # Calculate pixel size from dataset resolution
    pixel_size = datasets[0].res[0] * datasets[0].res[1]

    # Close datasets
    for ds in datasets:
        ds.close()

    # Clean up temporary files
    for temp_file in clips:
        os.remove(temp_file)

    result = {
        'result': histogram,
        'pixel_size': pixel_size,
    }

    # Cache if appropriate
    if stac_cachekey:
        cache.set(stac_cachekey, result, None)

    return result


@shared_task
def format_as_mmw_geoprocessing(result):
    """
    Return results formatted as MMW Geoprocessing

    To play well with existing patterns, and to allow for switching this out
    for other implementations in the future.
    """
    # Pass errors on
    if 'error' in result:
        return result

    formatted_histogram = {
        f'List({v})': int(c) for v, c in result['result'].items()
    }
    result['result'] = formatted_histogram

    return result


def get_albers_crs_for_aoi(aoi):
    """
    Return the Albers Equal Area Projection for the given AoI

    Since we want to calculate area, we need to use an Equal Area projection,
    but this differs based on where you are in the globe. We use rough bounding
    boxes to see if the shape neatly fits within one of the continents. If not,
    we fall back to a global approximation.
    """

    if aoi.within(box(-170, 15, -50, 75)):  # North America
        return 'EPSG:5070'
    elif aoi.within(box(-10, 34, 40, 72)):  # Europe
        return 'EPSG:3035'
    elif aoi.within(box(25, -10, 180, 60)):  # Asia
        return 'EPSG:102025'
    elif aoi.within(box(-20, -35, 55, 38)):  # Africa
        return 'EPSG:102022'
    elif aoi.within(box(-90, -60, -30, 15)):  # South America
        return 'EPSG:102033'
    elif aoi.within(box(112, -45, 155, -10)):  # Australia
        return 'EPSG:102034'
    else:  # Global
        return 'EPSG:54017'  # Behrmann Equal Area Cylindrical


def clip_and_reproject_tile(tiff, aoi, dst_crs, resampling=Resampling.nearest):
    """
    Clip a tiff to the given AoI and reproject to destination CRS

    We clip the tiff first, and then reproject only the clipped bits to
    minimize transformation. Uses nearest neighbor resampling by default.

    Returns the data, transform, and meta after clipping and reprojecting.
    """
    aoi_crs = aoi.crs if hasattr(aoi, 'crs') else 4326

    with rio.open(tiff) as src:
        # Reproject the AoI into the tiff's CRS, then clip the tiff to
        # the reprojected AoI's bounding box
        reprojected_aoi = transform_geom(aoi_crs, src.crs, aoi)
        reprojected_aoi_bbox = BoundingBox(*shape(reprojected_aoi).bounds)
        clip_data, clip_transform = mask(src, [reprojected_aoi], crop=True)

        # Define the output metadata for the reprojected clip
        dst_transform, width, height = calculate_default_transform(
            src.crs,
            dst_crs,
            clip_data.shape[2],
            clip_data.shape[1],
            *reprojected_aoi_bbox,
        )
        dst_meta = src.meta.copy()
        dst_meta.update(
            {
                'crs': dst_crs,
                'transform': dst_transform,
                'width': width,
                'height': height,
            }
        )

        # Reproject the clipped data to the destination CRS
        reprojected_clip_data = np.empty(
            (src.count, height, width), dtype=src.dtypes[0]
        )
        reproject(
            source=clip_data,
            destination=reprojected_clip_data,
            src_transform=clip_transform,
            src_crs=src.crs,
            dst_transform=dst_transform,
            dst_crs=dst_crs,
            resampling=resampling,
        )

        return reprojected_clip_data, dst_transform, dst_meta
