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
    autoscaling as asg
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


class Application(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'StackColor': ['global:StackColor'],
        'KeyName': ['global:KeyName'],
        'AvailabilityZones': ['global:AvailabilityZones',
                              'VPC:AvailabilityZones'],
        'RDSPassword': ['global:RDSPassword', 'DataPlane:RDSPassword'],
        'AppServerInstanceType': ['global:AppServerInstanceType'],
        'AppServerAMI': ['global:AppServerAMI'],
        'AppServerInstanceProfile': ['global:AppServerInstanceProfile'],
        'AppServerAutoScalingDesired': ['global:AppServerAutoScalingDesired'],
        'AppServerAutoScalingMin': ['global:AppServerAutoScalingMin'],
        'AppServerAutoScalingMax': ['global:AppServerAutoScalingMax'],
        'SSLCertificateARN': ['global:SSLCertificateARN'],
        'BackwardCompatSSLCertificateARN':
        ['global:BackwardCompatSSLCertificateARN'],
        'PublicSubnets': ['global:PublicSubnets', 'VPC:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets', 'VPC:PrivateSubnets'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
        'BlueTileServerDistributionEndpoint':
        ['global:BlueTileServerDistributionEndpoint',
            'TileDeliveryNetwork:BlueTileServerDistributionEndpoint'],
        'GreenTileServerDistributionEndpoint':
        ['global:GreenTileServerDistributionEndpoint',
            'TileDeliveryNetwork:GreenTileServerDistributionEndpoint'],
        'ITSIBaseURL': ['global:ITSIBaseURL'],
        'ITSISecretKey': ['global:ITSISecretKey'],
        'RollbarServerSideAccessToken':
        ['global:RollbarServerSideAccessToken'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'StackColor': 'Green',
        'KeyName': 'mmw-stg',
        'AppServerInstanceType': 't2.micro',
        'AppServerInstanceProfile': 'AppServerInstanceProfile',
        'AppServerAutoScalingDesired': '1',
        'AppServerAutoScalingMin': '1',
        'AppServerAutoScalingMax': '1',
    }

    ATTRIBUTES = {
        'StackType': 'StackType',
        'StackColor': 'StackColor',
    }

    def set_up_stack(self):
        super(Application, self).set_up_stack()

        tags = self.get_input('Tags').copy()
        tags.update({'StackType': 'Application'})

        self.default_tags = tags
        self.region = self.get_input('Region')

        self.add_description('Application server stack for MMW')

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

        self.app_server_instance_type = self.add_parameter(Parameter(
            'AppServerInstanceType', Type='String', Default='t2.micro',
            Description='Application server EC2 instance type',
            AllowedValues=EC2_INSTANCE_TYPES,
            ConstraintDescription='must be a valid EC2 instance type.'
        ), 'AppServerInstanceType')

        self.app_server_ami = self.add_parameter(Parameter(
            'AppServerAMI', Type='String',
            Default=self.get_recent_app_server_ami(),
            Description='Application server AMI'
        ), 'AppServerAMI')

        self.app_server_instance_profile = self.add_parameter(Parameter(
            'AppServerInstanceProfile', Type='String',
            Default='AppServerInstanceProfile',
            Description='Application server instance profile'
        ), 'AppServerInstanceProfile')

        self.app_server_auto_scaling_desired = self.add_parameter(Parameter(
            'AppServerAutoScalingDesired', Type='String', Default='1',
            Description='Application server AutoScalingGroup desired'
        ), 'AppServerAutoScalingDesired')

        self.app_server_auto_scaling_min = self.add_parameter(Parameter(
            'AppServerAutoScalingMin', Type='String', Default='1',
            Description='Application server AutoScalingGroup minimum'
        ), 'AppServerAutoScalingMin')

        self.app_server_auto_scaling_max = self.add_parameter(Parameter(
            'AppServerAutoScalingMax', Type='String', Default='1',
            Description='Application server AutoScalingGroup maximum'
        ), 'AppServerAutoScalingMax')

        self.ssl_certificate_arn = self.add_parameter(Parameter(
            'SSLCertificateARN', Type='String',
            Description='ARN for a SSL certificate stored in IAM'
        ), 'SSLCertificateARN')

        self.backward_compat_ssl_certificate_arn = self.add_parameter(
            Parameter(
                'BackwardCompatSSLCertificateARN', Type='String',
                Description='ARN for a SSL certificate stored in IAM'
            ), 'BackwardCompatSSLCertificateARN')

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

        self.blue_tile_distribution_endpoint = self.add_parameter(Parameter(
            'BlueTileServerDistributionEndpoint', Type='String',
            Description='Endpoint for blue tile CloudFront distribution'
        ), 'BlueTileServerDistributionEndpoint')

        self.green_tile_distribution_endpoint = self.add_parameter(Parameter(
            'GreenTileServerDistributionEndpoint', Type='String',
            Description='Endpoint for green tile CloudFront distribution'
        ), 'GreenTileServerDistributionEndpoint')

        self.itsi_base_url = self.add_parameter(Parameter(
            'ITSIBaseURL', Type='String',
            Description='Base URL for ITSI portal'
        ), 'ITSIBaseURL')

        self.itsi_secret_key = self.add_parameter(Parameter(
            'ITSISecretKey', Type='String', NoEcho=True,
            Description='Secret key for ITSI portal integration'
        ), 'ITSISecretKey')

        app_server_lb_security_group, \
            app_server_security_group = self.create_security_groups()
        app_server_lb, \
            backward_compat_app_server_lb = self.create_load_balancers(
                app_server_lb_security_group)

        self.create_auto_scaling_resources(app_server_security_group,
                                           app_server_lb,
                                           backward_compat_app_server_lb)

        self.create_cloud_watch_resources(app_server_lb)

        self.add_output(Output('AppServerLoadBalancerEndpoint',
                               Value=GetAtt(app_server_lb, 'DNSName')))
        self.add_output(Output('AppServerLoadBalancerHostedZoneNameID',
                               Value=GetAtt(app_server_lb,
                                            'CanonicalHostedZoneNameID')))
        self.add_output(Output('BackwardCompatAppServerLoadBalancerEndpoint',
                               Value=GetAtt(backward_compat_app_server_lb,
                                            'DNSName')))
        self.add_output(
            Output('BackwardCompatAppServerLoadBalancerHostedZoneNameID',
                   Value=GetAtt(backward_compat_app_server_lb,
                                'CanonicalHostedZoneNameID')))

    def get_recent_app_server_ami(self):
        try:
            app_server_ami_id = self.get_input('AppServerAMI')
        except MKUnresolvableInputError:
            app_server_ami_id = get_recent_ami(self.aws_profile, 'mmw-app-*')

        return app_server_ami_id

    def create_security_groups(self):
        app_server_lb_security_group_name = 'sgAppServerLoadBalancer'

        app_server_lb_security_group = self.add_resource(ec2.SecurityGroup(
            app_server_lb_security_group_name,
            GroupDescription='Enables access to application servers via a '
                             'load balancer',
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
            Tags=self.get_tags(Name=app_server_lb_security_group_name)
        ))

        app_server_security_group_name = 'sgAppServer'

        app_server_security_group = self.add_resource(ec2.SecurityGroup(
            app_server_security_group_name,
            DependsOn='sgAppServerLoadBalancer',
            GroupDescription='Enables access to application servers',
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
                for sg in [app_server_lb_security_group]
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
            Tags=self.get_tags(Name=app_server_security_group_name)
        ))

        return app_server_lb_security_group, app_server_security_group

    def create_load_balancers(self, app_server_lb_security_group):
        app_server_lb_name = 'elbAppServer'
        backward_compat_app_server_lb_name = 'elbBackwardCompatAppServer'

        return [
            self.add_resource(elb.LoadBalancer(
                app_server_lb_name,
                ConnectionDrainingPolicy=elb.ConnectionDrainingPolicy(
                    Enabled=True,
                    Timeout=300,
                ),
                CrossZone=True,
                SecurityGroups=[Ref(app_server_lb_security_group)],
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
                Tags=self.get_tags(Name=app_server_lb_name)
            )),
            self.add_resource(elb.LoadBalancer(
                backward_compat_app_server_lb_name,
                ConnectionDrainingPolicy=elb.ConnectionDrainingPolicy(
                    Enabled=True,
                    Timeout=300,
                ),
                CrossZone=True,
                SecurityGroups=[Ref(app_server_lb_security_group)],
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
                        SSLCertificateId=Ref(
                            self.backward_compat_ssl_certificate_arn)
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
                Tags=self.get_tags(Name=backward_compat_app_server_lb_name)
            ))]

    def create_auto_scaling_resources(self, app_server_security_group,
                                      app_server_lb,
                                      backward_compat_app_server_lb):
        self.add_condition('BlueCondition', Equals('Blue', Ref(self.color)))
        self.add_condition('GreenCondition', Equals('Green', Ref(self.color)))

        blue_app_server_launch_config = self.add_resource(
            asg.LaunchConfiguration(
                'lcAppServerBlue',
                Condition='BlueCondition',
                ImageId=Ref(self.app_server_ami),
                IamInstanceProfile=Ref(self.app_server_instance_profile),
                InstanceType=Ref(self.app_server_instance_type),
                KeyName=Ref(self.keyname),
                SecurityGroups=[Ref(app_server_security_group)],
                UserData=Base64(
                    Join('', self.get_cloud_config(
                        self.blue_tile_distribution_endpoint)))
            ))

        self.add_resource(
            asg.AutoScalingGroup(
                'asgAppServerBlue',
                AvailabilityZones=Ref(self.availability_zones),
                Condition='BlueCondition',
                Cooldown=300,
                DesiredCapacity=Ref(self.app_server_auto_scaling_desired),
                HealthCheckGracePeriod=600,
                HealthCheckType='ELB',
                LaunchConfigurationName=Ref(blue_app_server_launch_config),
                LoadBalancerNames=[Ref(app_server_lb),
                                   Ref(backward_compat_app_server_lb)],
                MaxSize=Ref(self.app_server_auto_scaling_max),
                MinSize=Ref(self.app_server_auto_scaling_min),
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
                Tags=[asg.Tag('Name', 'AppServer', True)])
        )

        green_app_server_launch_config = self.add_resource(
            asg.LaunchConfiguration(
                'lcAppServerGreen',
                Condition='GreenCondition',
                ImageId=Ref(self.app_server_ami),
                IamInstanceProfile=Ref(self.app_server_instance_profile),
                InstanceType=Ref(self.app_server_instance_type),
                KeyName=Ref(self.keyname),
                SecurityGroups=[Ref(app_server_security_group)],
                UserData=Base64(
                    Join('', self.get_cloud_config(
                        self.green_tile_distribution_endpoint)))
            ))

        self.add_resource(
            asg.AutoScalingGroup(
                'asgAppServerGreen',
                AvailabilityZones=Ref(self.availability_zones),
                Condition='GreenCondition',
                Cooldown=300,
                DesiredCapacity=Ref(self.app_server_auto_scaling_desired),
                HealthCheckGracePeriod=600,
                HealthCheckType='ELB',
                LaunchConfigurationName=Ref(green_app_server_launch_config),
                LoadBalancerNames=[Ref(app_server_lb),
                                   Ref(backward_compat_app_server_lb)],
                MaxSize=Ref(self.app_server_auto_scaling_max),
                MinSize=Ref(self.app_server_auto_scaling_min),
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
                Tags=[asg.Tag('Name', 'AppServer', True)])
        )

    def get_cloud_config(self, tile_distribution_endpoint):
        return ['#cloud-config\n',
                '\n',
                'write_files:\n',
                '  - path: /etc/mmw.d/env/MMW_STACK_COLOR\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.color), '\n',
                '  - path: /etc/mmw.d/env/MMW_STACK_TYPE\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', self.get_input('StackType'), '\n',
                '  - path: /etc/mmw.d/env/MMW_PUBLIC_HOSTED_ZONE_NAME\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.public_hosted_zone_name), '\n',
                '  - path: /etc/mmw.d/env/MMW_DB_PASSWORD\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.rds_password), '\n',
                '  - path: /etc/mmw.d/env/MMW_TILER_HOST\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(tile_distribution_endpoint), '\n',
                '  - path: /etc/mmw.d/env/ROLLBAR_SERVER_SIDE_ACCESS_TOKEN\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', self.get_input('RollbarServerSideAccessToken'), '\n',  # NOQA
                '  - path: /etc/mmw.d/env/MMW_ITSI_BASE_URL\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.itsi_base_url), '\n',
                '  - path: /etc/mmw.d/env/MMW_ITSI_SECRET_KEY\n',
                '    permissions: 0750\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.itsi_secret_key)]

    def create_cloud_watch_resources(self, app_server_lb):
        self.add_resource(cw.Alarm(
            'alarmAppServerBackend4XX',
            AlarmDescription='Application server backend 4XXs',
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
                    Value=Ref(app_server_lb)
                )
            ],
        ))

        self.add_resource(cw.Alarm(
            'alarmAppServerBackend5XX',
            AlarmDescription='Application server backend 5XXs',
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
                    Value=Ref(app_server_lb)
                )
            ],
        ))

    def get_tags(self, **kwargs):
        """Helper method to return Troposphere tags + default tags

        Args:
          **kwargs: arbitrary keyword arguments to be used as tags
        """
        kwargs.update(self.default_tags)
        return Tags(**kwargs)
