package com.azavea.mmw

import akka.actor.{ActorSystem, Props}
import akka.io.IO
import spray.can.Http
import akka.pattern.ask
import akka.util.Timeout
import scala.concurrent.duration._

object Boot extends App {
  implicit val system = ActorSystem()
  implicit val timeout = Timeout(5.seconds)
  val service = system.actorOf(Props[GeopServiceActor])

  IO(Http) ? Http.Bind(service, interface = "localhost", port = 8107)
}
