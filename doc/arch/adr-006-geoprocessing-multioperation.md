# Multi-Operation Geoprocessing Operation

## Context

### Current Operations

Currently the geoprocessing service provides this set of operations:

  * [`rasterGroupedCount`][github 1]
  * [`rasterGroupedAverage`][github 2]
  * [`rasterAverage`][github 3]
  * [`rasterLinesJoin`][github 4]
  * [`rasterSummary`][github 5]

Each operation takes a multipolygon and a list of rasters, queries those
rasters cropped to the multipolygon, and performs the respective calculation,
and returns the result grouped by the given rasters.

These operations are then [configured][github 6] and [called][github 7] in
Model My Watershed (MMW) for different sets of rasters. The results are then
aggregated in MMW using Python. In some cases, such as MapShed, **each project
invokes 10 separate calls to the geoprocessing service**, the results of which
are then aggregated in Python before being sent back to the front-end.

The performance of each of these operations for a shape around the size of a
HUC-12 (which is slightly smaller than a 512 tile) is about 1s. For a larger
shape like a HUC-8 which can be 15-50 times larger, the average time is about
6s. Since the front-end invokes a number of these jobs, and spends time polling
with Celery, the average wait time for a HUC-8 MapShed job is around 30s. This
has so far been acceptable.

When a geoprocessing service returns successfully, we cache the results. So if
another user selects the same shape and the same rasters are queried for it,
the cached results are used and the overall wait is much shorter.

### Subbasin Modeling

Subbasin Modeling divides a larger HUC-8 into its component HUC-12s to improve
accuracy of results. Under this new scheme, instead of running a single HUC-8,
we run MapShed for all component HUC-12s and then aggregate those results. This
severely affects the runtime, to the point of not being usable. For more
discussion on this methodology and affect on runtime, please see
[#2537][github 8].

Much of this additional runtime comes from processing the same tiles for
multiple HUC-12s. For example, consider [the following case][ocks]:

![image][githubusercontent]

The red shape intersects five tiles, and the purple shape intersects only one
tile, one of red's five. When querying the red shape we fetch all five tiles,
and when querying the purple shape we fetch that tile again. This kind of
duplication happens all across a HUC-8, since it is querying a number of
adjacent HUC-12s.

Furthermore, it is our understanding that fetching tiles from S3 is the largest
portion of a single request's execution time. Thus, removing its duplication is
the greatest speedup we could achieve in a single step.

## Proposed Solution

To optimize and reuse tile fetches, the geoprocessing service needs to be aware
that they will be reused. Thus, rather than performing an operation for a
single shape, the geoprocessing service should take a set of shapes. In this
set, one should be the parent shape, and all the rest should be the component
shapes. The parent shape will be used to fetch tiles from S3 and store them in
memory. Then, the operation will be performed on every component shape,
choosing the intersecting subset of tiles already in memory. Instead of the
output being a single set of results, it will be a list of sets of results, in
the same order as the incoming component shapes.

The above can be done either to the existing operations, and adapting their
output in MMW to account for the new list return format. Previous operations
can still be supported with just a singleton list as the output. Or the above
can be implemented as new, "multishape" versions of the same operations.

Furthermore, since a number of the geoprocessing calls invoked by MapShed query
the same rasters, e.g. [n][github 9][l][github 10][c][github 11][d][github 12],
including them in them in the same geoprocessing call would be a speed up as
well. This would require not only sending a set of shapes, but a set of
operations as well, each with an `operationType` and a list of `rasters`. The
output should be a list of lists of sets of results, where the first list
matches the list of component shapes, and the second the list of operations.

Optionally, we can investigate capturing the sequence of tiles into a
[`CompositeTile`][github 13] per raster. The benefit to using `CompositeTile`
is when a child shape intersects with a small subset of the total tiles
intersecting the parent shape, we can iterate over just those by intersecting
that shape with the `CompositeTile`. However, since the current code is
implemented as [operating over a sequence of tiles][github 14], changing to
`CompositeTile` will remove the parallelism over each individual tile. However,
we should parallelize over operations per query geometry, possibly alleviating
this issue. Since the benefits of this optimization are hard to estimate, we
should defer this refactor unless the performance is not good enough after the
other changes.

Since both the input and output of this operation can be quite different than
the current implementation, it should be added as a new operation type rather
than a modification to an existing one. Subbasin modeling is just a wrapper
around MapShed, as it decomposes a parent shape into child shapes and runs
MapShed on each of them, before aggregating the results together. In order to
fully take advantage of the optimization, MapShed itself must be updated to use
the new operation. The new operation should also support submitting a single
shape instead of a list of shapes, i.e. the use case for a single HUC-12. In
this case the output should be a singleton list of list of results. This will
allow regular MapShed to use the same operation, rather than have a competing
implementation for Subbasin modeling.

## Decision

We will add a new operation to the geoprocessing service that takes a list of
shapes and a list of operations. The first shape in the list is assumed to be
the parent shape that contains all the other child shapes. Using the parent
shape we pull the tiles corresponding to every raster in the list of
operations, and collect them in a sequence.

Then, for each child shape, we go through the list of operations and calculate
the results using the respective tile sequence from above. All the results are
then collected in order and returned as a list.

Once this ADR is approved, the next steps will be:

  1. Define input and outputs for new geoprocessing operation
  2. Implement new geoprocessing operation
  3. Benchmark the new operation against current ones
  4. Make a new release of the geoprocessing service and publish it
  5. Update MMW to use the new geoprocessing service
  6. Update MapShed to use the new operation
  7. Update Subbasin code to use the new operation

## Consequences

This change is not limited to the geoprocessing service, so MMW will have to be
updated accordingly.

When running the new operation, we will get a list of lists of sets of results.
These should be cached independently with the right keys, so when compiling a
list of operations to perform we can check if the results are cached or not.
This may require some rearchitecting of where the caching happens. In its
current spot in [`geoprocessing.py`][github 15], it checks to see if the entire
operation is cached or not. This will need to be changed to support checking
sub-operation caches for every shape, and only execute those that haven't been
cached.

The workflow for the above may look something like:

  1. `[django]` Receive request, start Celery job
  2. `[celery]` Enumerate all the shapes and operations needed for a subbasin
     MapShed run
  3. `[celery]` Check the cache for their keys, and make a list of all that are
     not available. Invoke geoprocessing.
  4. `[geoprocessing]` Execute the new multi-operation geoprocessing for the
     ones not available
  5. `[celery]` Once the results come back, cache them with the right key
  6. `[celery]` Get all results out of the cache and return

The underlying wisdom seems to be that in order to gain efficiency, we must
move more of the execution logic from Python to Scala. This efficiency could
come at a loss of flexibility that we have had so far, but can be avoided with
the right design of input format. Furthermore, the existing operations will
continue to function, and will be available for other use cases, e.g. other
Analyze tasks.

[github 1]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L240
[github 2]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L192
[github 3]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L149
[github 4]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L114
[github 5]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L281
[github 6]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/mmw/settings/base.py#L428-L619
[github 7]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/apps/modeling/mapshed/tasks.py#L477-L489
[github 8]: https://github.com/WikiWatershed/model-my-watershed/pull/2537
[github 9]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/mmw/settings/base.py#L463
[github 10]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/mmw/settings/base.py#L478
[github 11]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/mmw/settings/base.py#L513
[github 12]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/mmw/settings/base.py#L537
[github 13]: https://github.com/locationtech/geotrellis/blob/master/raster/src/main/scala/geotrellis/raster/CompositeTile.scala
[github 14]: https://github.com/WikiWatershed/mmw-geoprocessing/blob/c212f29e0b090dd9624b8f637e59fdf6cbbf4f4c/api/src/main/scala/Geoprocessing.scala#L253-L262
[github 15]: https://github.com/WikiWatershed/model-my-watershed/blob/3ec450adc9ffb84b5483ccdc338cdeacb36f8b2b/src/mmw/apps/modeling/geoprocessing.py#L62
[githubusercontent]: https://user-images.githubusercontent.com/1430060/35651490-e1fc5f38-06ad-11e8-8f07-994aae77a43c.png
[ocks]: http://bl.ocks.org/anonymous/raw/bf3ee7a3e3315b4e872476bd7e4bb479/
