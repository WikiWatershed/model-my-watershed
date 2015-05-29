package com.azavea.mmw

import geotrellis.spark.utils.SparkUtils
import org.apache.spark.{SparkConf, SparkContext}
import org.scalatest._
import org.scalatest.BeforeAndAfterAll
import scala.util._

object OnlyIfCanRunSpark {
  lazy val _sc = Try{
    System.setProperty("spark.driver.port", "0")
    System.setProperty("spark.hostPort", "0")

    val sparkContext = SparkUtils.createLocalSparkContext("local[8]", "Test Context", new SparkConf())

    System.clearProperty("spark.driver.port")
    System.clearProperty("spark.hostPort")

    sparkContext
  }
}

trait OnlyIfCanRunSpark extends FunSpec with BeforeAndAfterAll {
  import OnlyIfCanRunSpark._

  implicit def sc: SparkContext = _sc.get
  
  def ifCanRunSpark(f: => Unit): Unit = {    
     _sc match {
      case Success(sc) => f
      case Failure(error) => ignore(error.getMessage) {}
    }    
  }  
}
