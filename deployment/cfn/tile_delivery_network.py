from troposphere import (
    Parameter,
    Ref,
    Output,
    Tags,
    GetAtt,
    Join,
    cloudfront as cf
)

from majorkirby import StackNode


class TileDeliveryNetwork(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'PrivateHostedZoneId': ['global:PrivateHostedZoneId',
                                'PrivateHostedZone:PrivateHostedZoneId'],
        'PrivateHostedZoneName': ['global:PrivateHostedZoneName'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def set_up_stack(self):
        super(TileDeliveryNetwork, self).set_up_stack()

        tags = self.get_input('Tags').copy()
        tags.update({'StackType': 'TileDeliveryNetwork'})

        self.default_tags = tags
        self.region = self.get_input('Region')

        self.add_description('Tile delivery network stack for MMW')

        # Parameters
        self.public_hosted_zone_name = self.add_parameter(Parameter(
            'PublicHostedZoneName', Type='String',
            Description='Route 53 public hosted zone name'
        ), 'PublicHostedZoneName')

        self.private_hosted_zone_id = self.add_parameter(Parameter(
            'PrivateHostedZoneId', Type='String',
            Description='Route 53 private hosted zone ID'
        ), 'PrivateHostedZoneId')

        self.private_hosted_zone_name = self.add_parameter(Parameter(
            'PrivateHostedZoneName', Type='String',
            Description='Route 53 private hosted zone name'
        ), 'PrivateHostedZoneName')

        blue_tile_distribution, \
            green_tile_distribution = self.create_cloudfront_distributions()

        self.add_output(Output('BlueTileServerDistributionEndpoint',
                               Value=GetAtt(blue_tile_distribution,
                                            'DomainName')))
        self.add_output(Output('GreenTileServerDistributionEndpoint',
                               Value=GetAtt(green_tile_distribution,
                                            'DomainName')))

    def create_cloudfront_distributions(self):
        blue_tile_distribution = self.add_resource(cf.Distribution(
            'tileDistributionBlue',
            DistributionConfig=cf.DistributionConfig(
                Origins=[
                    cf.Origin(
                        Id='tileOriginId',
                        DomainName=Join('.',
                                        ['blue-tiles',
                                         Ref(self.public_hosted_zone_name)]),
                        CustomOriginConfig=cf.CustomOrigin(
                            OriginProtocolPolicy='http-only'
                        )
                    )
                ],
                DefaultCacheBehavior=cf.DefaultCacheBehavior(
                    ForwardedValues=cf.ForwardedValues(QueryString=True),
                    TargetOriginId='tileOriginId',
                    ViewerProtocolPolicy='allow-all'
                ),
                Enabled=True
            )
        ))

        green_tile_distribution = self.add_resource(cf.Distribution(
            'tileDistributionGreen',
            DistributionConfig=cf.DistributionConfig(
                Origins=[
                    cf.Origin(
                        Id='tileOriginId',
                        DomainName=Join('.',
                                        ['green-tiles',
                                         Ref(self.public_hosted_zone_name)]),
                        CustomOriginConfig=cf.CustomOrigin(
                            OriginProtocolPolicy='http-only'
                        )
                    )
                ],
                DefaultCacheBehavior=cf.DefaultCacheBehavior(
                    ForwardedValues=cf.ForwardedValues(QueryString=True),
                    TargetOriginId='tileOriginId',
                    ViewerProtocolPolicy='allow-all'
                ),
                Enabled=True
            )
        ))

        # TODO: Add CloudWatch 4XX and 5XX alarms

        return blue_tile_distribution, green_tile_distribution

    def get_tags(self, **kwargs):
        """Helper method to return Troposphere tags + default tags

        Args:
          **kwargs: arbitrary keyword arguments to be used as tags
        """
        kwargs.update(self.default_tags)
        return Tags(**kwargs)
