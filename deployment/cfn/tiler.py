from troposphere import (
    Parameter,
    Ref,
    Output,
    Tags,
    GetAtt,
    Base64,
    Join,
    Equals,
    cloudwatch as cw,
    ec2,
    elasticloadbalancing as elb,
    autoscaling as asg,
    route53 as r53
)

from utils.cfn import get_recent_ami

from utils.constants import (
    ALLOW_ALL_CIDR,
    EC2_INSTANCE_TYPES,
    GRAPHITE,
    HTTP,
    HTTPS,
    POSTGRESQL,
    REDIS,
    RELP,
    SSH,
    STATSITE,
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
        'TileServerInstanceType': ['global:TileServerInstanceType'],
        'TileServerAMI': ['global:TileServerAMI'],
        'TileServerInstanceProfile': ['global:TileServerInstanceProfile'],
        'TileServerAutoScalingDesired': ['global:TileServerAutoScalingDesired'],  # NOQA
        'TileServerAutoScalingMin': ['global:TileServerAutoScalingMin'],
        'TileServerAutoScalingMax': ['global:TileServerAutoScalingMax'],
        'PublicSubnets': ['global:PublicSubnets', 'VPC:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets', 'VPC:PrivateSubnets'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
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

        tags = self.get_input('Tags').copy()
        tags.update({'StackType': 'Tiler'})

        self.default_tags = tags
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

        tile_server_lb_security_group, \
            tile_server_security_group = self.create_security_groups()
        tile_server_lb = self.create_load_balancer(
            tile_server_lb_security_group)

        self.create_auto_scaling_resources(tile_server_security_group,
                                           tile_server_lb)

        self.create_cloud_watch_resources(tile_server_lb)

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
            tile_server_ami_id = get_recent_ami(self.aws_profile,
                                                'mmw-tiler-*',
                                                owner='self')

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
                for p in [HTTP]
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
                for p in [GRAPHITE, POSTGRESQL, REDIS, STATSITE, RELP]
            ] + [
                ec2.SecurityGroupRule(
                    IpProtocol='udp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [STATSITE]
            ] + [
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=ALLOW_ALL_CIDR, FromPort=p,
                    ToPort=p
                )
                for p in [HTTP, HTTPS]
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

        self.add_resource(
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

    def get_cloud_config(self):
        return ['#cloud-config\n',
                '\n',
                'write_files:\n',
                '  - path: /etc/mmw.d/env/MMW_STACK_COLOR\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.color)]

    def create_cloud_watch_resources(self, tile_server_lb):
        self.add_resource(cw.Alarm(
            'alarmTileServerBackend4XX',
            AlarmDescription='Tile server backend 4XXs',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Sum',
            Period=300,
            Threshold='20',
            EvaluationPeriods=1,
            ComparisonOperator='GreaterThanThreshold',
            MetricName='HTTPCode_Backend_4XX',
            Namespace='AWS/ELB',
            Dimensions=[
                cw.MetricDimension(
                    'metricLoadBalancerName',
                    Name='LoadBalancerName',
                    Value=Ref(tile_server_lb)
                )
            ],
        ))

        self.add_resource(cw.Alarm(
            'alarmTileServerBackend5XX',
            AlarmDescription='Tile server backend 5XXs',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Sum',
            Period=60,
            Threshold='0',
            EvaluationPeriods=1,
            ComparisonOperator='GreaterThanThreshold',
            MetricName='HTTPCode_Backend_5XX',
            Namespace='AWS/ELB',
            Dimensions=[
                cw.MetricDimension(
                    'metricLoadBalancerName',
                    Name='LoadBalancerName',
                    Value=Ref(tile_server_lb)
                )
            ],
        ))

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
