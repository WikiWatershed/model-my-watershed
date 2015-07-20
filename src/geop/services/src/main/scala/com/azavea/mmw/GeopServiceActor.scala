package com.azavea.mmw

import akka.actor.Actor
import spray.routing._
import spray.http._

/**
 * This loader will shortly be replaced by one that loads from S3
 * catalogues instead of small, local test files.  This entire object
 * will probably go away, with the possible exception of
 * jsonHistogram.
 */
object Loader {
  import geotrellis.raster.io.geotiff.reader._
  import geotrellis.raster._
  import geotrellis.raster.reproject._
  import geotrellis.vector._
  import geotrellis.vector.reproject._
  import geotrellis.vector.io.json._
  import geotrellis.spark.utils.SparkUtils
  import geotrellis.spark._
  import geotrellis.spark.tiling._
  import geotrellis.raster.mosaic._
  import geotrellis.proj4._

  import org.apache.spark._
  import org.apache.spark.{SparkConf, SparkContext}

  import spray.json._
  import spray.json.DefaultJsonProtocol._
  import spray.httpx.unmarshalling._

  import scala.util._

  import DataFiles._
  import Histogram._

  implicit val sc: SparkContext = SparkUtils.createSparkContext("Geoprocessing", new SparkConf())
  val nlcd = DataFiles.delawareNLCD
  val soil = DataFiles.delawareSoil

  def jsonHistogram(str: String) : String = {
    val geometry = str.parseJson.convertTo[Geometry]
    geometry match {
      case p: Polygon => Histogram.gtHistogram(nlcd, soil, MultiPolygon(p)).toList.toJson.prettyPrint
      case mp: MultiPolygon => Histogram.gtHistogram(nlcd, soil, mp).toList.toJson.prettyPrint
      case col: GeometryCollection => {
        val polygons = col.polygons.map { p => MultiPolygon(p) } ++ col.multiPolygons
        polygons.map { p => Histogram.gtHistogram(nlcd, soil, p).toList }.toList.toJson.prettyPrint
      }
      case g: Geometry => ""
    }
  }
}

class GeopServiceActor extends Actor with GeopService {
  def actorRefFactory = context
  def receive = runRoute(myRoute)
}

trait GeopService extends HttpService {
  import scala.util._

  import MediaTypes._
  import Loader._

  val myRoute =
    path("") {
      post {
        respondWithMediaType(`application/json`) {
          entity(as[String]) {
            str => {
              Try { Loader.jsonHistogram(str) } match {
                case Success(output) => {
                  if (output.length > 0) {
                    complete(output)
                  } else {
                    complete(400, "Input must be a Polygon, MultiPolygon, or GeometryCollection.")
                  }
                }
                case Failure(_) => complete(400, "Invalid or no GeoJSON.")
              }
            }
          }
        }
      }
    }
}
