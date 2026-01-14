import boto3

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

        session = boto3.Session(profile_name=self.aws_profile,
                                region_name=region)
        route53_client = session.client('route53')
        s3_client = session.client('s3')

        # Get hosted zone ID
        zones_response = route53_client.list_hosted_zones_by_name(
            DNSName=hosted_zone_name
        )
        hosted_zone_id = None
        for zone in zones_response['HostedZones']:
            if zone['Name'].rstrip('.') == hosted_zone_name.rstrip('.'):
                hosted_zone_id = zone['Id']
                break

        if hosted_zone_id:
            # Create or update the alias record
            route53_client.change_resource_record_sets(
                HostedZoneId=hosted_zone_id,
                ChangeBatch={
                    'Changes': [{
                        'Action': 'UPSERT',
                        'ResourceRecordSet': {
                            'Name': hosted_zone_name,
                            'Type': 'A',
                            'SetIdentifier': 'Primary',
                            'Failover': 'PRIMARY',
                            'AliasTarget': {
                                'HostedZoneId': app_lb_hosted_zone_id,
                                'DNSName': app_lb_endpoint,
                                'EvaluateTargetHealth': True
                            }
                        }
                    }]
                }
            )

        # Configure S3 bucket website
        bucket_name = 'tile-cache.{}'.format(hosted_zone_name)
        website_config = {
            'ErrorDocument': {'Key': 'error.html'},
            'IndexDocument': {'Suffix': 'index.html'},
            'RoutingRules': [{
                'Condition': {'HttpErrorCodeReturnedEquals': '404'},
                'Redirect': {
                    'Protocol': 'https',
                    'HostName': f'{color.lower()}-tiles.{hosted_zone_name}',
                    'HttpRedirectCode': '302'
                }
            }]
        }
        s3_client.put_bucket_website(
            Bucket=bucket_name,
            WebsiteConfiguration=website_config
        )
