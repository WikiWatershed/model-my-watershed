from boto import s3, route53 as r53
from boto.s3.connection import OrdinaryCallingFormat

from majorkirby import CustomActionNode


class PublicHostedZone(CustomActionNode):
    """Represents a Route53 public hosted zone"""
    INPUTS = {
        'Region': ['global:Region'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'AppServerLoadBalancerEndpoint':
        ['global:AppServerLoadBalancerEndpoint',
         'Application:AppServerLoadBalancerEndpoint'],
        'AppServerLoadBalancerHostedZoneNameID':
        ['global:AppServerLoadBalancerHostedZoneNameID',
         'Application:AppServerLoadBalancerHostedZoneNameID'],
        'StackType': ['global:StackType'],
        'StackColor': ['global:StackColor'],
    }

    DEFAULTS = {
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'StackColor': 'Green',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def action(self):
        region = self.get_input('Region')
        color = self.get_input('StackColor')

        hosted_zone_name = self.get_input('PublicHostedZoneName')
        app_lb_endpoint = self.get_input('AppServerLoadBalancerEndpoint')
        app_lb_hosted_zone_id = self.get_input(
            'AppServerLoadBalancerHostedZoneNameID')

        route53_conn = r53.connect_to_region(region,
                                             profile_name=self.aws_profile)

        public_hosted_zone = route53_conn.get_zone(hosted_zone_name)
        record_sets = r53.record.ResourceRecordSets(route53_conn,
                                                    public_hosted_zone.id)
        record_sets.add_change('UPSERT', hosted_zone_name, 'A',
                               alias_hosted_zone_id=app_lb_hosted_zone_id,
                               alias_dns_name=app_lb_endpoint,
                               alias_evaluate_target_health=True,
                               identifier='Primary',
                               failover='PRIMARY')
        record_sets.commit()

        s3_conn = s3.connect_to_region(region,
                                       profile_name=self.aws_profile,
                                       calling_format=OrdinaryCallingFormat())

        bucket = s3_conn.get_bucket('tile-cache.{}'.format(hosted_zone_name))

        rules = s3.website.RoutingRules()
        rules.add_rule(s3.website.RoutingRule(
            s3.website.Redirect(
                protocol='https',
                http_redirect_code=302,
                hostname='{}-tiles.{}'.format(color.lower(),
                                              hosted_zone_name)),
            s3.website.Condition(http_error_code=404)))

        bucket.configure_website(suffix='index.html', error_key='error.html',
                                 routing_rules=rules)
