# 002 - Geoprocessing Caching

## Context

Geoprocessing calls for large shapes can take a long time to complete. While users can draw custom shapes, they can also pick from a list of predefined shapes in the system. Geoprocessing the same shape over and over when multiple users select it is wasteful and unnecessary. By caching the geoprocessing results of predefined shapes, or Well Known Areas of Interest (WKAoIs), we can improve user experience and application performance.

Outside of geoprocessing, there are also [some](https://github.com/WikiWatershed/model-my-watershed/blob/dea12ff9a6fb234e30978e97ed1d0f6266a406c9/src/mmw/apps/modeling/calcs.py#L28) [database](https://github.com/WikiWatershed/model-my-watershed/blob/dea12ff9a6fb234e30978e97ed1d0f6266a406c9/src/mmw/apps/modeling/calcs.py#L51) [calls](https://github.com/WikiWatershed/model-my-watershed/blob/dea12ff9a6fb234e30978e97ed1d0f6266a406c9/src/mmw/apps/modeling/calcs.py#L97), but these are much faster in comparison and are not likely to see significant improvement by caching, especially since the cache could be a table in the database itself.

In this ADR we consider the following questions:

 * What will be cached?
 * How will it be cached?
 * Where will it be cached?
 * When will it be cached?
 * How will the cache be invalidated?

We also sketch out an implementation plan, and consider consequences and side-effects.

## Decisions

### What will be cached?

The output of the geoprocessing service for WKAoIs will be cached. This is almost always a JSON blob of key-value pairs, where the key is a combination of overlaid cell values in a set of rasters, and the value is a count of such cells. The inputs are a GeoJSON shape and a [set of related arguments](https://github.com/WikiWatershed/model-my-watershed/blob/develop/src/mmw/mmw/settings/base.py#L412) that specify rasters, operation type, CRS, etc.

While we could cache the entire output of a MapShed or TR-55 run, an update to some of the constituent raster or vector data would force recalculation of the whole. By caching only the time-consuming geoprocessing results, we ensure that any updates to constituent rasters would invalidate only that specific cached result, leaving the others still current. And since vector data results would never be cached, they will always be current upon update as well.

In case of MapShed, the modifications do not change any of the geoprocessing queries, thus those requests can be cached easily. For TR-55, the modifications _do_ change the geoprocessing queries. For these cases, we will cache only the Current Conditions (modification-less) run, not other Scenarios, since storing arbitrary shapes can balloon the size of the cache very quickly. This decision may be revisited in the future.

In case we do not foresee updating the rasters very often, it may be beneficial to consider caching the entire JSON response of the API.

### How will it be cached?

The current stack already has [Django Caching](https://github.com/WikiWatershed/model-my-watershed/blob/a49cc115d18d2c67cbd0721cf62faa08e98d13fc/src/mmw/mmw/settings/base.py#L76-L90) setup. This allows us to cache with a single line of code:

```python
from django.core.cache import cache

cache.set(key, value, None)
```

where the `key` is a unique identified consisting of WKAoI id and the geoprocessing operation, `value` is the result of the geoprocessing operation, and `None` is the timeout value which ensures the values don't ever expire.

Retrieval is as simple as:

```python
value = cache.get(key)
if not value:
    # Calculate and cache the value

return value
```

The `key` should be prefixed with `geop` to namespace it from other cache entries in the app, composed of the WKAoI id, which consists of a table name and an integer id, and the [geoprocessing operation name](https://github.com/WikiWatershed/model-my-watershed/blob/a49cc115d18d2c67cbd0721cf62faa08e98d13fc/src/mmw/mmw/settings/base.py#L387). For example, `geop__boundary_huc08__1__nlcd_soils`. In practice, the `key` may actually be something like `:1:geop__boundary_huc08__1__nlcd_soils`, with a configurable app-wide prefix (which defaults to `''`) and a version number are prefixed to our key. However, as long as we always access the cache via `django.core.cache.cache`, we shouldn't need to worry about that.

### Where will it be cached?

Django Caching Framework can be configured to use a number of cache backends, including Redis and Database. It is currently setup to use Redis / [ElastiCache](https://aws.amazon.com/elasticache/redis/) in production.

The advantages of using Redis are:

 * It is already configured
 * It allows us to take advantage of the Django Caching Framework which is configured to use Redis
 * Redis is really fast, and a good candidate for storing key/value pairs like we intend to
 * It is designed to be a cache, and thus comes with mechanisms for timeout, LRU, and cache misses out of the box

The disadvantages of using Redis are:

 * In the case of system failure, the cached values will be lost, and will need to be cached again
 * If it purges least recently used values, it might not be a good candidate for storing hard-to-process large WKAoIs that are rarely used

### When will it be cached?

When a user selects a WKAoI, and a request is made to `/analyze` or `/modeling`, if the WKAoI results haven't already been cached, we will run and cache them. Over time, we will build up the cache, so that when new users request the same WKAoIs, they will get the cached results. These will be cached in the Celery Tasks where calculation would otherwise happen.

For a select few WKAoIs which are too large to process in the production infrastructure, such as HUC-8s which time-out during MapShed gathering phase, we can run their geoprocessing steps on more powerful infrastructure with longer timeouts in a batch process, cache the results, and then decommission it. This will make them available to regular users of the production app without needing the extra power to render them.

For this purpose, we'll need a pair of new Django management commands. The first should run the geoprocessing steps for given WKAoIs and save the results to a file. This will be run in the super environment. The second should take a file of pre-processed results for given shapes and operations, and add them to the cache. This will be run in the production environment.

### How will the cache be invalidated?

Since every cache entry is tagged with its type, if a certain raster is updated, we can remove all related cache entries. For example, if there are updates to `us-percent-slope-30m-epsg5070` raster, which is used in the [`nlcd_slope`](https://github.com/WikiWatershed/model-my-watershed/blob/a49cc115d18d2c67cbd0721cf62faa08e98d13fc/src/mmw/mmw/settings/base.py#L449) and [`slope`](https://github.com/WikiWatershed/model-my-watershed/blob/a49cc115d18d2c67cbd0721cf62faa08e98d13fc/src/mmw/mmw/settings/base.py#L462) requests, we could simply run

```python
cache.delete_pattern('geop__*__nlcd_slope')
cache.delete_pattern('geop__*__slope')
```

To refresh a specific shape we could do

```python
cache.delete_pattern('geop__boundary_huc08__1__*')
```

These could be management commands as well.

## Implementation Plan

1. See if TR-55 geoprocessing, currently done via [`SummaryJob`](https://github.com/WikiWatershed/mmw-geoprocessing/blob/develop/summary/src/main/scala/SummaryJob.scala), can be done via [`MapshedJob`](https://github.com/WikiWatershed/mmw-geoprocessing/blob/develop/summary/src/main/scala/MapshedJob.scala), for consistency. And if so, rewrite the geoprocessing bits to use `MapshedJob` instead.
2. Split [`nlcdSoilCensus`](https://github.com/WikiWatershed/model-my-watershed/blob/develop/src/mmw/mmw/settings/base.py#L388) into three requests: `nlcd`, `soil`, and `nlcd_soil`. The first two can be used for `/analyze` and will be much faster, while the second can be used for `/modeling/tr-55`.
3. Update the geoprocessing submodule to take GeoJSON shape or WKAoI id, and geoprocessing type, and return the output. Update the Celery Tasks or Django Views which use the geoprocessing submodule to use the new interface.
4. Add caching support to the geoprocessing submodule. All geoprocessing is done in two parts: `_start` and `_finish`. In the case of a cache hit, there should be a signal passed from `_start` to `_finish` that instructs it to fetch the value from the cache instead of `sjs_retrieve`.
5. Update the UI to send WKAoI id instead of GeoJSON for predefined shapes. RWD and user defined shapes should still be sent as GeoJSON.

## Consequences

This will make the worst case scenario, a cache miss, slightly longer than it currently is, because we'll be checking the cache before doing the actual geoprocessing.

In case of ElastiCache failures, the cache would have to be rebuilt.

Large WKAoIs that are processed out-of-band may get pushed out of the cache if they are not used and the cache exceeds its maximum size.

User defined shapes will still not be cached, and their runtime will not be improved at all by this. Since the longest time taking activity in the geoprocessing is fetching tiles from S3, adding a network cache there may help improve those runtimes.
