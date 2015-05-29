import sbt._
import sbt.Keys._
import scala.util.Properties

// sbt-assembly
import sbtassembly.Plugin._
import AssemblyKeys._

object Version {
  def either(environmentVariable: String, default: String): String =
    Properties.envOrElse(environmentVariable, default)

  val geotrellis  = "0.10.0-SNAPSHOT"
  val scala       = "2.10.5"
  val spray       = "1.2.2"
  val akka        = "2.3.9"
  lazy val hadoop      = either("SPARK_HADOOP_VERSION", "2.5.0")
  lazy val spark       = either("SPARK_VERSION", "1.2.0")

}

object MMWBuild extends Build {
  val resolutionRepos = Seq(
    "Local Maven Repository"  at "file://" + Path.userHome.absolutePath + "/.m2/repository",
    "Typesafe Repo"           at "http://repo.typesafe.com/typesafe/releases/",
    "spray repo"              at "http://repo.spray.io/"
  )

  // Default settings
  override lazy val settings =
    super.settings ++
  Seq(
    shellPrompt := { s => Project.extract(s).currentProject.id + " > " },
    version := "0.0.1",
    scalaVersion := Version.scala,
    organization := "com.azavea.mmw",

    // disable annoying warnings about 2.10.x
    conflictWarning in ThisBuild := ConflictWarning.disable,
    scalacOptions ++=
      Seq("-deprecation",
        "-unchecked",
        "-Yinline-warnings",
        "-language:implicitConversions",
        "-language:reflectiveCalls",
        "-language:higherKinds",
        "-language:postfixOps",
        "-language:existentials",
        "-feature"),

    publishMavenStyle := true,

    publishArtifact in Test := false,

    pomIncludeRepository := { _ => false },
    licenses := Seq("Apache 2.0" -> url("http://www.apache.org/licenses/LICENSE-2.0.html"))
  )

  val defaultAssemblySettings =
    assemblySettings ++
  Seq(
    test in assembly := {},
    mergeStrategy in assembly <<= (mergeStrategy in assembly) {
      (old) => {
        case "reference.conf" => MergeStrategy.concat
        case "application.conf" => MergeStrategy.concat
        case "META-INF/MANIFEST.MF" => MergeStrategy.discard
        case "META-INF\\MANIFEST.MF" => MergeStrategy.discard
        case _ => MergeStrategy.first
      }
    },
    resolvers ++= resolutionRepos
  )

  // Project: root
  lazy val root =
    Project("mmw", file("."))
      .aggregate(processing, services)

  // Project: processing

  lazy val processing: Project =
    Project("processing", file("processing"))
      .settings(processingSettings:_*)

  lazy val processingSettings =
    Seq(
      organization := "com.azavea.mmw-processing",
      name := "mmw-processing",

      scalaVersion := Version.scala,

      fork := true,
      // raise memory limits here if necessary
      javaOptions += "-Xmx2G",
      javaOptions += "-Djava.library.path=/usr/local/lib",

      libraryDependencies ++= Seq(
        "com.azavea.geotrellis" %% "geotrellis-spark" % Version.geotrellis,
        "org.apache.spark" %% "spark-core" % Version.spark % "provided",
        "org.apache.hadoop" % "hadoop-client" % Version.hadoop % "provided",

        "org.scalatest" %%  "scalatest" % "2.2.0" % "test"
      )
    ) ++
  defaultAssemblySettings

  // Project: services

  lazy val services: Project =
    Project("services", file("services"))
      .settings(servicesSettings:_*)
      .dependsOn(processing)

  lazy val servicesSettings =
    Seq(
      organization := "com.azavea.mmw-services",
      name := "mmw-services",

      scalaVersion := Version.scala,

      // raise memory limits here if necessary
      javaOptions += "-Xmx2G",
      javaOptions += "-Djava.library.path=/usr/local/lib",

      libraryDependencies ++= Seq(
        "com.azavea.geotrellis" %% "geotrellis-spark" % Version.geotrellis,
        "io.spray"            %   "spray-can"     % Version.spray,
        "io.spray"            %   "spray-routing" % Version.spray,
        "io.spray"            %   "spray-caching" % Version.spray,
        "io.spray"            %%  "spray-json"    % "1.2.6",
        "com.typesafe.akka"   %%  "akka-actor"    % Version.akka,
        "com.typesafe.akka"   %%  "akka-testkit"  % Version.akka   % "test",
        "com.quantifind" %% "sumac" % "0.3.0",

        "org.scalatest" %%  "scalatest" % "2.2.0" % "test"
      )
    ) ++
  defaultAssemblySettings
}
