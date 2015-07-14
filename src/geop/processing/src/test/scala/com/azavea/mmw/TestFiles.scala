package com.azavea.mmw

import geotrellis.raster.io.geotiff.reader._
import geotrellis.raster._
import geotrellis.raster.reproject._
import geotrellis.vector._
import geotrellis.vector.reproject._
import geotrellis.spark._
import geotrellis.spark.tiling._
import geotrellis.raster.mosaic._

import geotrellis.proj4._

import org.apache.spark._

object TestFiles {
  val dataPath = "src/test/data"

  def getRaster(p: String): Raster = {
    val geoTiff = GeoTiffReader.read(p)
    val crs = geoTiff.metaData.crs
    val extent = geoTiff.metaData.extent
    val reprojectedExtent = extent.reproject(crs, LatLng)
    val tile = geoTiff.bands.head.tile.reproject(extent, crs, LatLng).resample(500, 500)

    Raster(tile, reprojectedExtent)
  }

  def makeRDD(p: String)(implicit sc: SparkContext): RasterRDD[SpatialKey] = {
    val Raster(tile, extent) = getRaster(p)
    
    createRasterRDD(tile, extent)
  }

  def delawareNLCD(implicit sc: SparkContext): RasterRDD[SpatialKey] =
    makeRDD(s"$dataPath/NLCD_DE-clipped.tif")

  def delawareSoil(implicit sc: SparkContext): RasterRDD[SpatialKey] = 
    makeRDD(s"$dataPath/gSSURGO_DE_10m1-clipped.tif")

  def createRasterRDD(
    tile: Tile,
    extent: Extent
  )(implicit sc: SparkContext): RasterRDD[SpatialKey] = {
    val crs = LatLng
    val worldExtent = crs.worldExtent
    

    // the tile layout implies a resolution of the world layer, may/will cause resampling when .merge is called
    val layoutLevel: LayoutLevel = ZoomedLayoutScheme(tileSize = 256).levelFor(worldExtent, CellSize(extent, tile.cols, tile.rows))

    println(s"Matched $extent to zoom level ${layoutLevel.zoom}")
    val tileLayout = layoutLevel.tileLayout

    // Tile layout could be specified directly (as below), but the above method mirros the ingest methodology
    // val tileLayout = 
    //   TileLayout(
    //     layoutCols,
    //     layoutRows,
    //     256,
    //     256
    //   )

    // this objects knows how to translate between world tile layout,
    // tiled relative to CRS world extent boundatires and world extents
    // we assume that the output raster is in WGS 84 
    val outputMapTransform = new MapKeyTransform(worldExtent, tileLayout.layoutCols, tileLayout.layoutRows)

    val metaData = RasterMetaData(
      tile.cellType,
      extent,
      crs,
      tileLayout
    )

    val tmsTiles = 
      for {
        (col, row) <- outputMapTransform(extent).coords // iterate over all tiles we should have for input extent in the world layout
      } yield {
        val key = SpatialKey(col, row)
        println(s"MAKING: $key")
        val worldTileExtent = outputMapTransform(key) // this may be partially out of bounds of input tile
        val keyTile = ArrayTile.empty(tile.cellType, tileLayout.tileCols, tileLayout.tileRows) 
        // tile.merge comes from `import geotrellis.raster.mosaic`        
        keyTile.merge(worldTileExtent, extent, tile)
        key -> keyTile
      }

    asRasterRDD(metaData) {
      sc.parallelize(tmsTiles)
    }
  }
}
