package com.azavea.mmw

import geotrellis.vector._
import geotrellis.raster.histogram._
import geotrellis.spark._

import org.apache.spark.SparkContext._
import scala.collection.mutable
import spire.syntax.cfor._

object TR55 {
  /** Returns a map of values to counts */
  def combinations(nlcd: RasterRDD[SpatialKey], soil: RasterRDD[SpatialKey], polygon: Polygon): Map[(Int, Int), Int] =
    nlcd
      .join(soil)
      .map { case (key, (nlcdTile, soilTile)) =>
        val m = mutable.Map[(Int, Int), Int]()
        cfor(0)(_ < nlcdTile.rows, _ + 1) { row =>
          cfor(0)(_ < nlcdTile.cols, _ + 1) { col =>
            val c = (nlcdTile.get(col, row), soilTile.get(col, row))
            if(!m.contains(c)) { m(c) = 0 }
            m(c) += 1
          }
        }

        m.toMap
       }
      .reduce { (m1, m2) => 
        (m1.toSeq ++ m2.toSeq)
          .groupBy(_._1)
          .map { case (key, counts) => (key, counts.map(_._2).sum) }
          .toMap
      }
}
