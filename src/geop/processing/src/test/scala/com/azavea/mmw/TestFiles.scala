package com.azavea.mmw

import geotrellis.raster.io.geotiff.reader._
import geotrellis.raster._
import geotrellis.raster.reproject._
import geotrellis.vector._
import geotrellis.vector.reproject._
import geotrellis.spark._
import geotrellis.spark.tiling._

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

    createRasterRDD(tile, extent, 25, 25)
  }

  def delawareNLCD(implicit sc: SparkContext): RasterRDD[SpatialKey] =
    makeRDD(s"$dataPath/NLCD_DE-clipped.tif")

  def delawareSoil(implicit sc: SparkContext): RasterRDD[SpatialKey] = 
    makeRDD(s"$dataPath/gSSURGO_DE_10m1-clipped.tif")

  def createRasterRDD(
    tile: Tile,
    extent: Extent,
    layoutCols: Int,
    layoutRows: Int
  )(implicit sc: SparkContext): RasterRDD[SpatialKey] = {

    val worldExtent = LatLng.worldExtent

    val tileLayout = 
      TileLayout(
        layoutCols,
        layoutRows,
        tile.cols / layoutCols,
        tile.rows / layoutRows
      )

    val metaData = RasterMetaData(
      tile.cellType,
      extent,
      LatLng,
      tileLayout
    )

    val compositTile =
      CompositeTile.wrap(tile, tileLayout, cropped = false)

    val tmsTiles =
      for(tileRow <- 0 until tileLayout.layoutRows;
        tileCol <- 0 until tileLayout.layoutCols) yield {
        val cropped = compositTile.tiles(tileRow * tileLayout.layoutCols + tileCol)
        (SpatialKey(tileCol, tileRow), cropped.toArrayTile)
      }

    asRasterRDD(metaData) {
      sc.parallelize(tmsTiles)
    }
  }
}
