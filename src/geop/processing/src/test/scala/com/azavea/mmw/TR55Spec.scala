package com.azavea.mmw

import geotrellis.spark._
import geotrellis.raster._
import geotrellis.raster.histogram._

import geotrellis.vector._

import scala.collection.mutable
import org.scalatest._
import spire.syntax.cfor._

class TR55Spec extends FunSpec with Matchers with OnlyIfCanRunSpark {
  ifCanRunSpark {
    describe("TR55") {
      it("test the testfiles") {
        val dataPath = TestFiles.dataPath
        val p = s"$dataPath/NLCD_DE-clipped.tif"
        val expected = TestFiles.getRaster(p).tile
        val actual = TestFiles.delawareNLCD.stitch
        
        actual.cols should be (expected.cols)
        actual.rows should be (expected.rows)
        
        cfor(0)(_ < actual.cols, _  + 1) { col =>
          cfor(0)(_ < actual.rows, _ + 1) { row =>
            val v1 = actual.get(col, row)
            val v2 = expected.get(col, row)
            if (isNoData(v1)) isNoData(v2) should be (true)
            else if (isNoData(v2)) isNoData(v1) should be (true)
            else withClue(s"Failed at col: $col and row: $row") {
              v1 should be (v2)
            }
          }
        }
      }

      it("should compute the correct histogram for delaware rasters, full extent") {
        val nlcd = TestFiles.delawareNLCD
        val soil = TestFiles.delawareSoil

        val polygon: Polygon = nlcd.metaData.extent.toPolygon

        val actual = TR55.combinations(nlcd, soil, polygon)

        val expected = {
          val n = nlcd.stitch
          val s = soil.stitch

          assert(n.cols == s.cols)
          assert(n.rows == s.rows)

          val m = mutable.Map[(Int, Int), Int]()
          cfor(0)(_ < n.rows, _ + 1) { row =>
            cfor(0)(_ < n.cols, _ + 1) { col =>
              val c = (n.get(col, row), s.get(col, row))
              if(!m.contains(c)) { m(c) = 0 }
              m(c) += 1
            }
          }
        }

        actual should be (expected)
      }
    }
  }
}
