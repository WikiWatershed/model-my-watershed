# Switching to Collections API

## Motivation

Currently the geoprocessing service runs in an Apache Spark container, using Spark JobServer as an HTTP interface. Layer reading is done using an RDD, which can help parallelize heavy operations, such as counting the number of cells in a large raster. However, since the geoprocessing service runs on a single machine it does not take advantage of this parallelism, resulting in significant overhead and little payout.

## Benefits

GeoTrellis 1.0 adds a [Collections API for layer reading](https://geotrellis.github.io/scaladocs/latest/#geotrellis.spark.io.s3.S3CollectionLayerReader) which returns a Scala Sequence rather than an RDD. For the MMW use case this is a better fit, since the only geoprocessing operation we do is counting cells and averaging values, both of which are faster on a single machine using Collections API which removes all the Spark overhead. In our use case, this can lead to performance improvements of 300–500%.

Here is a table of performance improvements for NLCD and Soil requests, such as used for TR-55, for a HUC-12, a HUC-10, and a HUC-8, taken on `develop` using current service, on staging using current service, and a prototype service using the Collections API:

| nlcd-soils-huc12 | develop | staging | collections-api |
|------------------|--------:|--------:|----------------:|
| 1                |    3.35 |    3.07 |            1.61 |
| 2                |     2.9 |    2.59 |            1.54 |
| 3                |    3.24 |    2.21 |            1.52 |
| 4                |    3.57 |    2.07 |            1.35 |
| 5                |    3.06 |    2.28 |            1.97 |

| nlcd-soils-huc10 | develop | staging | collections-api |
|------------------|--------:|--------:|----------------:|
| 1                |    8.53 |    6.37 |            5.57 |
| 2                |    7.72 |    4.55 |            4.97 |
| 3                |    8.59 |    4.12 |            2.93 |
| 4                |    7.15 |    3.83 |            2.83 |
| 5                |    6.59 |    3.77 |            2.58 |

| nlcd-soils-huc8 | develop | staging | collections-api |
|-----------------|--------:|--------:|----------------:|
| 1               |   31.18 |   16.48 |            8.42 |
| 2               |   26.28 |   14.98 |            6.02 |
| 3               |    31.1 |   14.36 |            4.89 |
| 4               |    27.2 |   15.05 |            4.51 |
| 5               |   29.27 |   12.48 |            4.09 |

| average          | develop | staging | collections-api |
|------------------|--------:|--------:|----------------:|
| nlcd-soils-huc12 |   3.224 |   2.444 |           1.598 |
| nlcd-soils-huc10 |   7.716 |   4.528 |           3.776 |
| nlcd-soils-huc8  |  29.006 |   14.67 |           5.586 |

Here's a chart of the table above:

![image](https://cloud.githubusercontent.com/assets/1430060/26412141/c6eb7e26-4075-11e7-9b65-207bb286c171.png)

The difference in `develop` and staging are because of two factors: staging workers are more powerful, and have much faster access to S3 tiles. These advantages should carry over to the Collections API variant as well, thus making it even faster when deployed.

In addition, this will make our code simpler to understand and maintain, as well as make provisioning and deployment simpler by removing Spark and Spark JobServer. Since the geoprocessing service can now be packaged into a single JAR, we can also remove Docker and run it directly using OpenJDK 8.

These improved speeds may also allow us to increase the area of interest threshold on the front-end, allowing users to select even bigger areas than before and get faster results back.

## Challenges

GeoTrellis 1.0 is compiled for Java 8, whereas the current MMW environment is setup with Java 7. We will have to make a number of updates to the MMW environment to support Java 8.

Since Spark JobServer is no longer used, we will have to switch to using Akka HTTP for exposing the Geoprocessing service. This will also require updates to the relevant geoprocessing tasks in Celery. Provisioning scripts will also need to be updated.

Changes to the geoprocessing service may result in differences in how cells are counted, and may lead to different results for the same inputs. This is already seen to some extent in [mmw-geoprocessing#44](https://github.com/WikiWatershed/mmw-geoprocessing/pull/44). It is difficult to say which is _more_ correct, the current or the new implementation. But we will have to explain and justify the changes.

The Collections API has so far never been deployed to production. It comes with risks of "unknown unknowns", and we may have to solve unforeseen technical challenges.

## Drawbacks

Removing Spark JobServer will lead to the interaction between Celery and Geoprocessing becoming synchronous rather than asynchronous. This should be a tolerable difference, since the new synchronous requests should be 3–5 times faster than the old asynchronous ones, and a Celery task waiting for 5-10 seconds should be manageable. The Celery tasks should timeout after a sensible period.

The Collections API supports far fewer MapAlgebra operations than the RDD API. This is okay for now, as we are only counting cells and averaging their values. However, if we were to require MapAlgebra operations in the future, we may have to add back the RDD API.

## Approach

 1. Make a set of use cases that cover all the functionality of the current geoprocessing service
 2. Make a new project within the geoprocessing repo, and add an Akka HTTP service
 3. Add endpoints that take in the same JSON input as the current service, and perform the same operations, just using the Collections API instead
 4. Fine tune results so they match with the previous ones, or explain and justify why they are different
 5. Update geoprocessing service deployment to push JAR to GitHub instead of a Docker image to Quay
 6. Update MMW provisioning to remove Spark JobServer and Docker dependencies, add OpenJDK 8, and pull in geoprocessing JAR from GitHub
 7. Update geoprocessing Celery tasks to use the new service
 8. Test the UI to ensure values are still similar and sensible
 9. Update area of interest threshold to allow for larger sizes, better using the new capacity

In [this experimental branch](https://github.com/WikiWatershed/mmw-geoprocessing/tree/tt+ec/collections-api) we have 1, 2 and part of 3 covered from above. We can make cards for the rest. That branch needs to be cleaned up, including the API design and the build pipeline. It also only implements counting, so the ability to handle vector streams and average values needs to be added.

## Decision

The client is currently evaluating alternative performance enhancements, some of which may involve pre-processing a lot of information and storing it in the database, making runtime geoprocessing a matter of pulling information from the database and assembling it, which could be much faster if a little less precise. In case we go that route, spending time optimizing geoprocessing wouldn't help as much, as the service itself wouldn't be used as much.

However, if the current model continues to be used, the approach outlined here can be applied to improve geoprocessing performance by an order of magnitude.
