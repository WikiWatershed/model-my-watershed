import boto3

from majorkirby import CustomActionNode

import json


class PrivateHostedZone(CustomActionNode):
    """Represents a Route53 private hosted zone"""
    INPUTS = {
        'Region': ['global:Region'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'PrivateHostedZoneName': ['global:PrivateHostedZoneName'],
        'StackType': ['global:StackType'],
    }

    DEFAULTS = {
        'Region': 'us-east-1',
        'PrivateHostedZoneName': 'mmw.internal',
        'StackType': 'Staging',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def action(self):
        region = self.get_input('Region')
        session = boto3.Session(profile_name=self.aws_profile,
                                region_name=region)
        route53_client = session.client('route53')
        comment = json.dumps(self.get_raw_tags())

        # List all hosted zones
        response = route53_client.list_hosted_zones()
        hosted_zones = response.get('HostedZones', [])

        # Check if a matching hosted zone already exists
        for hosted_zone in hosted_zones:
            zone_config = hosted_zone.get('Config', {})
            if zone_config.get('Comment') == comment:
                self.stack_outputs = {
                    'PrivateHostedZoneId': hosted_zone['Id'].split('/')[-1]
                }
                return

        # Create new private hosted zone
        vpc_id = self.get_input('VpcId')
        zone_name = '{}.'.format(self.get_input('PrivateHostedZoneName'))
        
        response = route53_client.create_hosted_zone(
            Name=zone_name,
            VPC={
                'VPCRegion': region,
                'VPCId': vpc_id
            },
            CallerReference=str(hash(comment)),
            HostedZoneConfig={
                'Comment': comment,
                'PrivateZone': True
            }
        )
        
        hosted_zone_id = response['HostedZone']['Id'].split('/')[-1]
        self.stack_outputs = {'PrivateHostedZoneId': hosted_zone_id}
