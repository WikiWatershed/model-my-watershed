# Celery Broker

This project makes use of [Celery](https://celery.readthedocs.org/en/latest/) for queuing and processing background tasks. Celery has support for several [broker backends](https://celery.readthedocs.org/en/latest/getting-started/brokers/index.html), but we use Redis. Not necessarily because Redis is the best broker, but because it is a first class broker for Celery, and Amazon Web Services provides a hosted Redis solution in [ElastiCache](https://aws.amazon.com/about-aws/whats-new/2013/09/04/amazon-elasticache-for-redis/).

The ElastiCache cache cluster has a primary node that accepts reads and writes, while simultaneously replicating itself to a secondary node that acts as a read-replica. In the event of a failure to the primary, ElastiCache automatically handles promoting the read-replica. Replication is asynchronous, so there is still a good chance some data will be lost during a failover, but the important part is that we have a mechanism for getting getting another Redis into play quickly.

## ElastiCache Redis Gotchas

- Redis replication is asynchronous. Therefore, when a primary cluster fails over to a replica, a small amount of data might be lost due to replication lag.

- When selecting the replica to promote to primary, ElastiCache selects the replica with the least replication lag (the one that is most current).

- When you enable Multi-AZ on a replication group, a replica cluster cannot be manually promoted to primary. Thus, if the primary in AZ-1 fails over to a replica in AZ-2, the primary cluster stays in AZ-2. To promote the new replica in AZ-1 to primary, you must first disable Multi-AZ on the replication group, then do the promotion, and finally re-enable Multi-AZ.

- In the case where a cluster's failure is caused by the rare event of an entire Availability Zone failing, the replica replacing the failed primary is created only when the Availability Zone is back up. For example, if the primary cluster is in AZ-1 with replicas in AZ-2 and AZ-3, if the primary cluster fails the replica with the least replication lag is promoted to primary. ElastiCache then creates a new replica in AZ-1 (where the failed primary was) only when AZ-1 is back up and available.

- Rebooting a primary cluster does not trigger auto failover. When the primary node is rebooted, it is cleared of data when it comes back online. When the read replicas see the cleared primary, they clear their copy of the data, incurring data loss.

- Once a read replica has been promoted, the other replicas sync with their new primary. After the initial sync, the replicas’ content is deleted and they sync the data from the new primary, causing a brief interruption during which the replicas are not accessible. This sync process also causes temporary load on the primary while syncing with the replicas. This behavior is native to Redis and isn’t unique to ElastiCache Multi-AZ.

- Multi-AZ is not supported on `t1` and `t2` cache nodes (which is why we're on `m1.small` now).
