package com.azavea.mmw

import akka.actor.Actor
import spray.routing._
import spray.http._

object S3Loader {
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
  import geotrellis.spark.io.s3._
  import geotrellis.spark.op.local._

  import org.apache.spark._
  import org.apache.spark.{SparkConf, SparkContext}

  import spray.json._
  import spray.json.DefaultJsonProtocol._
  import spray.httpx.unmarshalling._

  import scala.util._

  import Histogram._

  val bucket = "com.azavea.datahub"
  val prefix = "catalog"
  val layerName = "nlcd-tms"
  val layerZoom = 13

  implicit val sc: SparkContext = SparkUtils.createSparkContext("Geoprocessing", new SparkConf())
  val catalogue = S3RasterCatalog(bucket, prefix)

  def getGeometry(str: String) : Geometry = {
    str.parseJson.convertTo[Geometry] match {
      case p: Polygon => p.reproject(LatLng, WebMercator)
      case mp: MultiPolygon => mp.reproject(LatLng, WebMercator)
      case gc: GeometryCollection => gc.reproject(LatLng, WebMercator)
    }
  }

  def getExtent(geometry: Geometry) : Extent = {
    geometry match {
      case p: Polygon => p.envelope
      case mp: MultiPolygon => mp.envelope
      case gc: GeometryCollection => gc.envelope
    }
  }

  def jsonHistogram(str: String) : String = {
    val geometry: Geometry = getGeometry(str)
    val extent: Extent = getExtent(geometry)
    val nlcd = catalogue.query[SpatialKey]((layerName, layerZoom))
      .where(Intersects(extent))
      .toRDD
      .localMap { z: Int => z }
    val soil = catalogue.query[SpatialKey]((layerName, layerZoom))
      .where(Intersects(extent))
      .toRDD
      .localMap { z: Int => {
        val a = 8121
        val c = 28411
        val m = 134456
        ((a * z * z + c) % m) % 5
      }
    }

    geometry match {
      case p: Polygon => Histogram.gtHistogram(nlcd, soil, MultiPolygon(p)).toList.toJson.prettyPrint
      case mp: MultiPolygon => Histogram.gtHistogram(nlcd, soil, mp).toList.toJson.prettyPrint
      case gc: GeometryCollection => {
        val polygons = gc.polygons.map { p => MultiPolygon(p) } ++ gc.multiPolygons
        polygons.map { p => Histogram.gtHistogram(nlcd, soil, p).toList }.toList.toJson.prettyPrint
      }
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
  import S3Loader._

  val myRoute =
    path("") {
      post {
        respondWithMediaType(`application/json`) {
          entity(as[String]) {
            str => {
              Try { S3Loader.jsonHistogram(str) } match {
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
