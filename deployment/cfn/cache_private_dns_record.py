from boto import (
    elasticache,
    route53
)

from majorkirby import CustomActionNode


class CachePrivateDNSRecord(CustomActionNode):
    """Represents a private DNS record for the ElastiCache cache cluster"""
    INPUTS = {
        'Region': ['global:Region'],
        'CacheCluster': ['global:CacheCluster', 'DataPlane:CacheCluster'],
        'PrivateHostedZoneName': ['global:PrivateHostedZoneName'],
        'StackType': ['global:StackType'],
    }

    DEFAULTS = {
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'PrivateHostedZoneName': 'mmw.internal',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def action(self):
        self.region = self.get_input('Region')
        self.hosted_zone_name = self.get_input('PrivateHostedZoneName')

        cache_cluster_endpoint = self.get_cache_cluster_endpoint(
            self.get_input('CacheCluster'))
        self.create_cache_private_dns_record(cache_cluster_endpoint)

    def get_cache_cluster_endpoint(self, cache_cluster_id):
        """Get the first cache cluster node endpoint"""
        elasticache_conn = elasticache.connect_to_region(self.region,
                                                         profile_name=self.aws_profile)  # NOQA
        cache_clusters = elasticache_conn.describe_cache_clusters(
            cache_cluster_id=cache_cluster_id,
            show_cache_node_info=True)['DescribeCacheClustersResponse']['DescribeCacheClustersResult']['CacheClusters']  # NOQA

        return cache_clusters[0]['CacheNodes'][0]['Endpoint']['Address']

    def create_cache_private_dns_record(self, cache_cluster_node_endpoint):
        """Create or update the private DNS entry for the cache cluster"""
        route53_conn = route53.connect_to_region(self.region,
                                                 profile_name=self.aws_profile)
        private_hosted_zone = route53_conn.get_zone(self.hosted_zone_name)
        cache_dns_record_name = 'cache.service.{}.'.format(
            self.hosted_zone_name)
        cache_dns_record = private_hosted_zone.get_cname(cache_dns_record_name)

        if not cache_dns_record:
            private_hosted_zone.add_cname(cache_dns_record_name,
                                          cache_cluster_node_endpoint, ttl=10)
        elif cache_cluster_node_endpoint not in cache_dns_record.resource_records:  # NOQA
            private_hosted_zone.update_cname(cache_dns_record_name,
                                             cache_cluster_node_endpoint,
                                             ttl=10)
