from troposphere import (
    Parameter,
    Ref,
    Output,
    Tags,
    GetAtt,
    Base64,
    Join,
    Equals,
    ec2,
    elasticloadbalancing as elb,
    autoscaling as asg,
    route53 as r53
)

from cfn.utils.cfn import get_recent_ami

from cfn.utils.constants import (
    ALLOW_ALL_CIDR,
    EC2_INSTANCE_TYPES,
    HTTP,
    HTTPS,
    POSTGRESQL,
    REDIS,
    SSH,
    VPC_CIDR
)

from majorkirby import StackNode, MKUnresolvableInputError


class Tiler(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'StackColor': ['global:StackColor'],
        'KeyName': ['global:KeyName'],
        'AvailabilityZones': ['global:AvailabilityZones',
                              'VPC:AvailabilityZones'],
        'RDSPassword': ['global:RDSPassword', 'DataPlane:RDSPassword'],
        'TileServerInstanceType': ['global:TileServerInstanceType'],
        'TileServerAMI': ['global:TileServerAMI'],
        'TileServerInstanceProfile': ['global:TileServerInstanceProfile'],
        'TileServerAutoScalingDesired': ['global:TileServerAutoScalingDesired'],  # NOQA
        'TileServerAutoScalingMin': ['global:TileServerAutoScalingMin'],
        'TileServerAutoScalingMax': ['global:TileServerAutoScalingMax'],
        'TileServerAutoScalingScheduleStartCapacity': ['global:TileServerAutoScalingScheduleStartCapacity'],  # NOQA
        'TileServerAutoScalingScheduleStartRecurrence': ['global:TileServerAutoScalingScheduleStartRecurrence'],  # NOQA
        'TileServerAutoScalingScheduleEndCapacity': ['global:TileServerAutoScalingScheduleEndCapacity'],  # NOQA
        'TileServerAutoScalingScheduleEndRecurrence': ['global:TileServerAutoScalingScheduleEndRecurrence'],  # NOQA
        'TiTilerHost': ['global:TiTilerHost'],
        'TiTilerLayerMap': ['global:TiTilerLayerMap'],
        'SSLCertificateARN': ['global:SSLCertificateARN'],
        'PublicSubnets': ['global:PublicSubnets', 'VPC:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets', 'VPC:PrivateSubnets'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
        'RollbarServerSideAccessToken':
        ['global:RollbarServerSideAccessToken'],
        'PapertrailHost': ['global:PapertrailHost'],
        'PapertrailPort': ['global:PapertrailPort'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'StackColor': 'Green',
        'KeyName': 'mmw-stg',
        'TileServerInstanceType': 't2.micro',
        'TileServerInstanceProfile': 'TileServerInstanceProfile',
        'TileServerAutoScalingDesired': '1',
        'TileServerAutoScalingMin': '1',
        'TileServerAutoScalingMax': '1',
    }

    ATTRIBUTES = {
        'StackType': 'StackType',
        'StackColor': 'StackColor',
    }

    def set_up_stack(self):
        super(Tiler, self).set_up_stack()

        self.default_tags = self.get_input('Tags').copy()
        self.region = self.get_input('Region')

        self.add_description('Tile server stack for MMW')

        # Parameters
        self.color = self.add_parameter(Parameter(
            'StackColor', Type='String',
            Description='Stack color', AllowedValues=['Blue', 'Green']
        ), 'StackColor')

        self.keyname = self.add_parameter(Parameter(
            'KeyName', Type='String',
            Description='Name of an existing EC2 key pair'
        ), 'KeyName')

        self.availability_zones = self.add_parameter(Parameter(
            'AvailabilityZones', Type='CommaDelimitedList',
            Description='Comma delimited list of availability zones'
        ), 'AvailabilityZones')

        self.rds_password = self.add_parameter(Parameter(
            'RDSPassword', Type='String', NoEcho=True,
            Description='Database password',
        ), 'RDSPassword')

        self.tile_server_instance_type = self.add_parameter(Parameter(
            'TileServerInstanceType', Type='String', Default='t2.micro',
            Description='Tile server EC2 instance type',
            AllowedValues=EC2_INSTANCE_TYPES,
            ConstraintDescription='must be a valid EC2 instance type.'
        ), 'TileServerInstanceType')

        self.tile_server_ami = self.add_parameter(Parameter(
            'TileServerAMI', Type='String',
            Default=self.get_recent_tile_server_ami(),
            Description='Tile server AMI'
        ), 'TileServerAMI')

        self.tile_server_instance_profile = self.add_parameter(Parameter(
            'TileServerInstanceProfile', Type='String',
            Default='TileServerInstanceProfile',
            Description='Tile server instance profile'
        ), 'TileServerInstanceProfile')

        self.tile_server_auto_scaling_desired = self.add_parameter(Parameter(
            'TileServerAutoScalingDesired', Type='String', Default='1',
            Description='Tile server AutoScalingGroup desired'
        ), 'TileServerAutoScalingDesired')

        self.tile_server_auto_scaling_min = self.add_parameter(Parameter(
            'TileServerAutoScalingMin', Type='String', Default='1',
            Description='Tile server AutoScalingGroup minimum'
        ), 'TileServerAutoScalingMin')

        self.tile_server_auto_scaling_max = self.add_parameter(Parameter(
            'TileServerAutoScalingMax', Type='String', Default='1',
            Description='Tile server AutoScalingGroup maximum'
        ), 'TileServerAutoScalingMax')

        self.tile_server_auto_scaling_schedule_start_recurrence = self.add_parameter(  # NOQA
            Parameter(
                'TileServerAutoScalingScheduleStartRecurrence', Type='String',
                Default='0 12 * * 1-5',
                Description='Tile server ASG schedule start recurrence'
            ), 'TileServerAutoScalingScheduleStartRecurrence')

        self.tile_server_auto_scaling_schedule_start_capacity = self.add_parameter(  # NOQA
            Parameter(
                'TileServerAutoScalingScheduleStartCapacity', Type='String',
                Default='1',
                Description='Tile server ASG schedule start capacity'
            ), 'TileServerAutoScalingScheduleStartCapacity')

        self.tile_server_auto_scaling_schedule_end_recurrence = self.add_parameter(  # NOQA
            Parameter(
                'TileServerAutoScalingScheduleEndRecurrence', Type='String',
                Default='0 0 * * *',
                Description='Tile server ASG schedule end recurrence'
            ), 'TileServerAutoScalingScheduleEndRecurrence')

        self.tile_server_auto_scaling_schedule_end_capacity = self.add_parameter(  # NOQA
            Parameter(
                'TileServerAutoScalingScheduleEndCapacity', Type='String',
                Default='1',
                Description='Tile server ASG schedule end capacity'
            ), 'TileServerAutoScalingScheduleEndCapacity')

        self.titiler_host = self.add_parameter(
            Parameter(
                'TiTilerHost', Type='String',
                Description='Fully qualified domain name for TiTiler-MosaicJSON service'
            ), 'TiTilerHost')

        self.titiler_layer_map = self.add_parameter(
            Parameter(
                'TiTilerLayerMap', Type='String',
                Description='List of layer__year__uuid entries for TiTiler mosaic layers'
            ), 'TiTilerLayerMap')

        self.ssl_certificate_arn = self.add_parameter(Parameter(
            'SSLCertificateARN', Type='String',
            Description='ARN for a SSL certificate stored in IAM'
        ), 'SSLCertificateARN')

        self.public_subnets = self.add_parameter(Parameter(
            'PublicSubnets', Type='CommaDelimitedList',
            Description='A list of public subnets'
        ), 'PublicSubnets')

        self.private_subnets = self.add_parameter(Parameter(
            'PrivateSubnets', Type='CommaDelimitedList',
            Description='A list of private subnets'
        ), 'PrivateSubnets')

        self.public_hosted_zone_name = self.add_parameter(Parameter(
            'PublicHostedZoneName', Type='String',
            Description='Route 53 public hosted zone name'
        ), 'PublicHostedZoneName')

        self.vpc_id = self.add_parameter(Parameter(
            'VpcId', Type='String',
            Description='VPC ID'
        ), 'VpcId')

        self.notification_topic_arn = self.add_parameter(Parameter(
            'GlobalNotificationsARN', Type='String',
            Description='ARN for an SNS topic to broadcast notifications'
        ), 'GlobalNotificationsARN')

        self.papertrail_host = self.add_parameter(Parameter(
            'PapertrailHost', Type='String',
            Description='Hostname for Papertrail log destination',
        ), 'PapertrailHost')

        self.papertrail_port = self.add_parameter(Parameter(
            'PapertrailPort', Type='String',
            Description='Port for Papertrail log destination',
        ), 'PapertrailPort')

        tile_server_lb_security_group, \
            tile_server_security_group = self.create_security_groups()
        tile_server_lb = self.create_load_balancer(
            tile_server_lb_security_group)

        self.create_auto_scaling_resources(tile_server_security_group,
                                           tile_server_lb)

        self.create_dns_records(tile_server_lb)

        self.add_output(Output('TileServerLoadBalancerEndpoint',
                               Value=GetAtt(tile_server_lb, 'DNSName')))
        self.add_output(Output('TileServerLoadBalancerHostedZoneNameID',
                               Value=GetAtt(tile_server_lb,
                                            'CanonicalHostedZoneNameID')))

    def get_recent_tile_server_ami(self):
        try:
            tile_server_ami_id = self.get_input('TileServerAMI')
        except MKUnresolvableInputError:
            filters = {'name': 'mmw-tiler*'}

            tile_server_ami_id = get_recent_ami(self.aws_profile, filters=filters,
                                                region=self.region)

        return tile_server_ami_id

    def create_security_groups(self):
        tile_server_lb_security_group_name = 'sgTileServerLoadBalancer'

        tile_server_lb_security_group = self.add_resource(ec2.SecurityGroup(
            tile_server_lb_security_group_name,
            GroupDescription='Enables access to tile servers via a load '
                             'balancer',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=ALLOW_ALL_CIDR, FromPort=p,
                    ToPort=p
                )
                for p in [HTTP, HTTPS]
            ],
            SecurityGroupEgress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [HTTP]
            ],
            Tags=self.get_tags(Name=tile_server_lb_security_group_name)
        ))

        tile_server_security_group_name = 'sgTileServer'

        tile_server_security_group = self.add_resource(ec2.SecurityGroup(
            tile_server_security_group_name,
            DependsOn='sgTileServerLoadBalancer',
            GroupDescription='Enables access to tile servers',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [SSH, HTTP]
            ] + [
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', SourceSecurityGroupId=Ref(sg),
                    FromPort=HTTP, ToPort=HTTP
                )
                for sg in [tile_server_lb_security_group]
            ],
            SecurityGroupEgress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [POSTGRESQL, REDIS]
            ] + [
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=ALLOW_ALL_CIDR, FromPort=p,
                    ToPort=p
                )
                for p in [HTTP, HTTPS, self.get_input('PapertrailPort')]
            ],
            Tags=self.get_tags(Name=tile_server_security_group_name)
        ))

        return tile_server_lb_security_group, tile_server_security_group

    def create_load_balancer(self, tile_server_lb_security_group):
        tile_server_lb_name = 'elbTileServer'

        return self.add_resource(elb.LoadBalancer(
            tile_server_lb_name,
            ConnectionDrainingPolicy=elb.ConnectionDrainingPolicy(
                Enabled=True,
                Timeout=300,
            ),
            CrossZone=True,
            SecurityGroups=[Ref(tile_server_lb_security_group)],
            Listeners=[
                elb.Listener(
                    LoadBalancerPort='80',
                    InstancePort='80',
                    Protocol='HTTP',
                ),
                elb.Listener(
                    LoadBalancerPort='443',
                    InstancePort='80',
                    Protocol='HTTPS',
                    SSLCertificateId=Ref(self.ssl_certificate_arn)
                )
            ],
            HealthCheck=elb.HealthCheck(
                Target='HTTP:80/health-check/',
                HealthyThreshold='3',
                UnhealthyThreshold='2',
                Interval='30',
                Timeout='5',
            ),
            Subnets=Ref(self.public_subnets),
            Tags=self.get_tags(Name=tile_server_lb_name)
        ))

    def create_auto_scaling_resources(self, tile_server_security_group,
                                      tile_server_lb):
        tile_server_launch_config_name = 'lcTileServer'

        tile_server_launch_config = self.add_resource(
            asg.LaunchConfiguration(
                tile_server_launch_config_name,
                ImageId=Ref(self.tile_server_ami),
                IamInstanceProfile=Ref(self.tile_server_instance_profile),
                InstanceType=Ref(self.tile_server_instance_type),
                KeyName=Ref(self.keyname),
                SecurityGroups=[Ref(tile_server_security_group)],
                UserData=Base64(
                    Join('', self.get_cloud_config()))
            ))

        tile_server_auto_scaling_group_name = 'asgTileServer'

        tile_server_asg = self.add_resource(
            asg.AutoScalingGroup(
                tile_server_auto_scaling_group_name,
                AvailabilityZones=Ref(self.availability_zones),
                Cooldown=300,
                DesiredCapacity=Ref(self.tile_server_auto_scaling_desired),
                HealthCheckGracePeriod=600,
                HealthCheckType='ELB',
                LaunchConfigurationName=Ref(tile_server_launch_config),
                LoadBalancerNames=[Ref(tile_server_lb)],
                MaxSize=Ref(self.tile_server_auto_scaling_max),
                MinSize=Ref(self.tile_server_auto_scaling_min),
                NotificationConfigurations=[
                    asg.NotificationConfigurations(
                        TopicARN=Ref(self.notification_topic_arn),
                        NotificationTypes=[
                            asg.EC2_INSTANCE_LAUNCH,
                            asg.EC2_INSTANCE_LAUNCH_ERROR,
                            asg.EC2_INSTANCE_TERMINATE,
                            asg.EC2_INSTANCE_TERMINATE_ERROR
                        ]
                    )
                ],
                VPCZoneIdentifier=Ref(self.private_subnets),
                Tags=[asg.Tag('Name', 'TileServer', True)]
            )
        )

        self.add_resource(
            asg.ScheduledAction(
                'schedTileServerAutoScalingStart',
                AutoScalingGroupName=Ref(tile_server_asg),
                DesiredCapacity=Ref(
                    self.tile_server_auto_scaling_schedule_start_capacity),
                Recurrence=Ref(
                    self.tile_server_auto_scaling_schedule_start_recurrence)
            )
        )

        self.add_resource(
            asg.ScheduledAction(
                'schedTileServerAutoScalingEnd',
                AutoScalingGroupName=Ref(tile_server_asg),
                DesiredCapacity=Ref(
                    self.tile_server_auto_scaling_schedule_end_capacity),
                Recurrence=Ref(
                    self.tile_server_auto_scaling_schedule_end_recurrence)
            )
        )

    def get_cloud_config(self):
        return ['#cloud-config\n',
                '\n',
                'write_files:\n',
                '  - path: /etc/mmw.d/env/MMW_STACK_COLOR\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.color), '\n',
                '  - path: /etc/mmw.d/env/MMW_STACK_TYPE\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', self.get_input('StackType'), '\n',
                '  - path: /etc/mmw.d/env/MMW_DB_PASSWORD\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.rds_password), '\n',
                '  - path: /etc/mmw.d/env/MMW_TILECACHE_BUCKET\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Join('.', ['tile-cache', Ref(self.public_hosted_zone_name)]), '\n',  # NOQA
                '  - path: /etc/mmw.d/env/MMW_TITILER_HOST\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.titiler_host), '\n',
                '  - path: /etc/mmw.d/env/MMW_TITILER_LAYER_MAP\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.titiler_layer_map), '\n',
                '  - path: /etc/mmw.d/env/ROLLBAR_SERVER_SIDE_ACCESS_TOKEN\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', self.get_input('RollbarServerSideAccessToken'), '\n'  # NOQA
                '\n',
                'rsyslog:\n',
                '  - $DefaultNetstreamDriverCAFile /etc/papertrail-bundle.pem # trust these CAs\n',
                '  - $PreserveFQDN off\n',
                '  - $ActionSendStreamDriver gtls # use gtls netstream driver\n',
                '  - $ActionSendStreamDriverMode 1 # require TLS\n',
                '  - $ActionSendStreamDriverAuthMode x509/name # authenticate by hostname\n',
                '  - $ActionSendStreamDriverPermittedPeer *.papertrailapp.com\n',
                '  - $ActionResumeInterval 10\n',
                '  - $ActionQueueSize 100000\n',
                '  - $ActionQueueDiscardMark 97500\n',
                '  - $ActionQueueHighWaterMark 80000\n',
                '  - $ActionQueueType LinkedList\n',
                '  - $ActionQueueFileName papertrailqueue\n',
                '  - $ActionQueueCheckpointInterval 100\n',
                '  - $ActionQueueMaxDiskSpace 2g\n',
                '  - $ActionResumeRetryCount -1\n',
                '  - $ActionQueueSaveOnShutdown on\n',
                '  - $ActionQueueTimeoutEnqueue 2\n',
                '  - $ActionQueueDiscardSeverity 0\n',
                '  - "*.*  @@', Ref(self.papertrail_host), ':', Ref(
                    self.papertrail_port), '"\n',
                'rsyslog_filename: 22-mmw-papertrail.conf\n']

    def create_dns_records(self, tile_server_lb):
        self.add_condition('BlueCondition', Equals('Blue', Ref(self.color)))
        self.add_condition('GreenCondition', Equals('Green', Ref(self.color)))

        self.add_resource(r53.RecordSetGroup(
            'dnsPublicRecordsBlue',
            Condition='BlueCondition',
            HostedZoneName=Join('', [Ref(self.public_hosted_zone_name), '.']),
            RecordSets=[
                r53.RecordSet(
                    'dnsTileServersBlue',
                    AliasTarget=r53.AliasTarget(
                        GetAtt(tile_server_lb, 'CanonicalHostedZoneNameID'),
                        GetAtt(tile_server_lb, 'DNSName'),
                        True
                    ),
                    Name=Join('', ['blue-tiles.',
                                   Ref(self.public_hosted_zone_name), '.']),
                    Type='A'
                )
            ]
        ))

        self.add_resource(r53.RecordSetGroup(
            'dnsPublicRecordsGreen',
            Condition='GreenCondition',
            HostedZoneName=Join('', [Ref(self.public_hosted_zone_name), '.']),
            RecordSets=[
                r53.RecordSet(
                    'dnsTileServersGreen',
                    AliasTarget=r53.AliasTarget(
                        GetAtt(tile_server_lb, 'CanonicalHostedZoneNameID'),
                        GetAtt(tile_server_lb, 'DNSName'),
                        True
                    ),
                    Name=Join('', ['green-tiles.',
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
