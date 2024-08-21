from troposphere import (
    Parameter,
    Ref,
    Output,
    Tags,
    GetAtt,
    Join,
    cloudfront as cf,
    route53 as r53,
    s3
)

from cfn.utils.constants import (
    AMAZON_S3_HOSTED_ZONE_ID,
    AMAZON_S3_WEBSITE_DOMAIN,
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
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def set_up_stack(self):
        super(TileDeliveryNetwork, self).set_up_stack()

        self.default_tags = self.get_input('Tags').copy()
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

        self.notification_topic_arn = self.add_parameter(Parameter(
            'GlobalNotificationsARN', Type='String',
            Description='ARN for an SNS topic to broadcast notifications'
        ), 'GlobalNotificationsARN')

        blue_tile_distribution, \
            green_tile_distribution = self.create_cloudfront_distributions()

        self.create_s3_resources()

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
                                        ['tile-cache',
                                         Ref(self.public_hosted_zone_name)]),
                        CustomOriginConfig=cf.CustomOriginConfig(
                            OriginProtocolPolicy='http-only'
                        )
                    )
                ],
                DefaultCacheBehavior=cf.DefaultCacheBehavior(
                    ForwardedValues=cf.ForwardedValues(QueryString=True),
                    TargetOriginId='tileOriginId',
                    ViewerProtocolPolicy='allow-all',
                    # Set TTLs to 0 so we don't cache S3 responses
                    MinTTL=0,
                    DefaultTTL=0,
                    MaxTTL=0
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
                                        ['tile-cache',
                                         Ref(self.public_hosted_zone_name)]),
                        CustomOriginConfig=cf.CustomOriginConfig(
                            OriginProtocolPolicy='http-only'
                        )
                    )
                ],
                DefaultCacheBehavior=cf.DefaultCacheBehavior(
                    ForwardedValues=cf.ForwardedValues(QueryString=True),
                    TargetOriginId='tileOriginId',
                    ViewerProtocolPolicy='allow-all',
                    # Set TTLs to 0 so we don't cache S3 responses
                    MinTTL=0,
                    DefaultTTL=0,
                    MaxTTL=0
                ),
                Enabled=True
            )
        ))

        return blue_tile_distribution, green_tile_distribution

    def create_s3_resources(self):
        s3_bucket = self.add_resource(s3.Bucket(
            's3TileCacheBucket',
            BucketName=Join('.', ['tile-cache',
                                  Ref(self.public_hosted_zone_name)]),
            AccessControl=s3.PublicRead,
            CorsConfiguration=s3.CorsConfiguration(
                CorsRules=[
                    s3.CorsRules(
                        AllowedOrigins=['*'],
                        AllowedMethods=['GET'],
                        MaxAge=3000,
                        AllowedHeaders=['*'],
                    )
                ]
            )
        ))

        self.add_resource(s3.BucketPolicy(
            's3TileCacheBucketPolicy',
            Bucket=Ref(s3_bucket),
            PolicyDocument={
                'Statement': [{
                    'Action': ['s3:GetObject'],
                    'Effect': 'Allow',
                    'Resource': {
                        'Fn::Join': ['', [
                            'arn:aws:s3:::',
                            Ref(s3_bucket),
                            '/*'
                        ]]
                    },
                    'Principal': '*'
                }]
            }
        ))

        self.add_resource(r53.RecordSetGroup(
            'dnsPublicRecordsCache',
            HostedZoneName=Join('', [Ref(self.public_hosted_zone_name), '.']),
            RecordSets=[
                r53.RecordSet(
                    'dnsTileServersCache',
                    AliasTarget=r53.AliasTarget(
                        AMAZON_S3_HOSTED_ZONE_ID,
                        AMAZON_S3_WEBSITE_DOMAIN,
                        True,
                    ),
                    Name=Join('', ['tile-cache.',
                                   Ref(self.public_hosted_zone_name), '.']),
                    Type='A'
                )
            ]
        ))

    def get_tags(self, **kwargs):
        """Helper method to return Troposphere tags + default tags

        Args:
          **kwargs: arbitrary keyword arguments to be used as tags
        """
        kwargs.update(self.default_tags)
        return Tags(**kwargs)
