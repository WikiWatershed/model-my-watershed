package com.azavea.mmw

import geotrellis.vector._
import geotrellis.vector.io.json._
import geotrellis.vector.reproject._
import geotrellis.proj4._
import geotrellis.raster._
import geotrellis.raster.histogram._
import geotrellis.raster.rasterize.{Rasterizer, Callback}
import geotrellis.spark._

import org.apache.spark.SparkContext._

import scala.collection.mutable

import spire.syntax.cfor._

object Histogram {
  /** Returns a map of values to counts */
  def gtHistogram(nlcd: RasterRDD[SpatialKey], soil: RasterRDD[SpatialKey], mp: MultiPolygon): Map[(Int, Int), Int] = {
    val mapTransform = nlcd.metaData.mapTransform
    val nlcdAndSoil = nlcd.join(soil)
    val histogram = nlcdAndSoil
      .map { case (key, (nlcdTile, soilTile)) =>
        val extent = mapTransform(key) // transform spatial key to map extent
        val rasterExtent = RasterExtent(extent, nlcdTile.cols, nlcdTile.rows) // transform extent to raster extent
        val clipped = mp & extent
        val localHistogram = mutable.Map[(Int, Int), Int]()

        clipped match {
          case PolygonResult(pr) =>
            Rasterizer.foreachCellByPolygon(pr, rasterExtent)(
              new Callback {
                def apply(col: Int, row: Int): Unit = {
                  val nlcdType = nlcdTile.get(col,row)
                  val soilType = soilTile.get(col,row)

                  if ((nlcdType != NODATA) && (soilType != NODATA)) {
                    val c = (nlcdType, soilType)
                    if(!localHistogram.contains(c)) { localHistogram(c) = 0 }
                    localHistogram(c) += 1
                  }
                }
              }
            )
          case unexpected =>
        }

        localHistogram.toMap
    }

    histogram
      .reduce { (m1, m2) =>
      (m1.toSeq ++ m2.toSeq)
        .groupBy(_._1)
        .map { case (key, counts) => (key, counts.map(_._2).sum) }
        .toMap
    }
  }
}
