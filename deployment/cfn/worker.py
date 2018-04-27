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


class Worker(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'StackColor': ['global:StackColor'],
        'KeyName': ['global:KeyName'],
        'IPAccess': ['global:IPAccess'],
        'AvailabilityZones': ['global:AvailabilityZones',
                              'VPC:AvailabilityZones'],
        'RDSPassword': ['global:RDSPassword', 'DataPlane:RDSPassword'],
        'WorkerInstanceType': ['global:WorkerInstanceType'],
        'WorkerAMI': ['global:WorkerAMI'],
        'WorkerInstanceProfile': ['global:WorkerInstanceProfile'],
        'WorkerAutoScalingDesired': ['global:WorkerAutoScalingDesired'],  # NOQA
        'WorkerAutoScalingMin': ['global:WorkerAutoScalingMin'],
        'WorkerAutoScalingMax': ['global:WorkerAutoScalingMax'],
        'WorkerAutoScalingScheduleStartCapacity': ['global:WorkerAutoScalingScheduleStartCapacity'],  # NOQA
        'WorkerAutoScalingScheduleStartRecurrence': ['global:WorkerAutoScalingScheduleStartRecurrence'],  # NOQA
        'WorkerAutoScalingScheduleEndCapacity': ['global:WorkerAutoScalingScheduleEndCapacity'],  # NOQA
        'WorkerAutoScalingScheduleEndRecurrence': ['global:WorkerAutoScalingScheduleEndRecurrence'],  # NOQA
        'PublicSubnets': ['global:PublicSubnets', 'VPC:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets', 'VPC:PrivateSubnets'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
        'SRATCatchmentAPIURL': ['global:SRATCatchmentAPIURL'],
        'SRATCatchmentAPIKey': ['global:SRATCatchmentAPIKey'],
        'RollbarServerSideAccessToken':
        ['global:RollbarServerSideAccessToken'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'StackColor': 'Green',
        'KeyName': 'mmw-stg',
        'IPAccess': ALLOW_ALL_CIDR,
        'WorkerInstanceType': 't2.micro',
        'WorkerInstanceProfile': 'WorkerInstanceProfile',
        'WorkerAutoScalingDesired': '1',
        'WorkerAutoScalingMin': '1',
        'WorkerAutoScalingMax': '1',
    }

    ATTRIBUTES = {
        'StackType': 'StackType',
        'StackColor': 'StackColor',
    }

    def set_up_stack(self):
        super(Worker, self).set_up_stack()

        tags = self.get_input('Tags').copy()
        tags.update({'StackType': 'Worker'})

        self.default_tags = tags
        self.region = self.get_input('Region')

        self.add_description('Worker stack for MMW')

        # Parameters
        self.color = self.add_parameter(Parameter(
            'StackColor', Type='String',
            Description='Stack color', AllowedValues=['Blue', 'Green']
        ), 'StackColor')

        self.keyname = self.add_parameter(Parameter(
            'KeyName', Type='String',
            Description='Name of an existing EC2 key pair'
        ), 'KeyName')

        self.ip_access = self.add_parameter(Parameter(
            'IPAccess', Type='String', Default=self.get_input('IPAccess'),
            Description='CIDR for allowing SSH access'
        ), 'IPAccess')

        self.availability_zones = self.add_parameter(Parameter(
            'AvailabilityZones', Type='CommaDelimitedList',
            Description='Comma delimited list of availability zones'
        ), 'AvailabilityZones')

        self.rds_password = self.add_parameter(Parameter(
            'RDSPassword', Type='String', NoEcho=True,
            Description='Database password',
        ), 'RDSPassword')

        self.worker_instance_type = self.add_parameter(Parameter(
            'WorkerInstanceType', Type='String', Default='t2.micro',
            Description='Worker EC2 instance type',
            AllowedValues=EC2_INSTANCE_TYPES,
            ConstraintDescription='must be a valid EC2 instance type.'
        ), 'WorkerInstanceType')

        self.worker_ami = self.add_parameter(Parameter(
            'WorkerAMI', Type='String',
            Default=self.get_recent_worker_ami(),
            Description='Worker AMI'
        ), 'WorkerAMI')

        self.worker_instance_profile = self.add_parameter(Parameter(
            'WorkerInstanceProfile', Type='String',
            Default='WorkerInstanceProfile',
            Description='Worker instance profile'
        ), 'WorkerInstanceProfile')

        self.worker_auto_scaling_desired = self.add_parameter(Parameter(
            'WorkerAutoScalingDesired', Type='String', Default='2',
            Description='Worker AutoScalingGroup desired'
        ), 'WorkerAutoScalingDesired')

        self.worker_auto_scaling_min = self.add_parameter(Parameter(
            'WorkerAutoScalingMin', Type='String', Default='0',
            Description='Worker AutoScalingGroup minimum'
        ), 'WorkerAutoScalingMin')

        self.worker_auto_scaling_max = self.add_parameter(Parameter(
            'WorkerAutoScalingMax', Type='String', Default='2',
            Description='Worker AutoScalingGroup maximum'
        ), 'WorkerAutoScalingMax')

        self.worker_auto_scaling_schedule_start_recurrence = self.add_parameter(  # NOQA
            Parameter(
                'WorkerAutoScalingScheduleStartRecurrence', Type='String',
                Default='0 12 * * 1-5',
                Description='Worker ASG schedule start recurrence'
            ), 'WorkerAutoScalingScheduleStartRecurrence')

        self.worker_auto_scaling_schedule_start_capacity = self.add_parameter(  # NOQA
            Parameter(
                'WorkerAutoScalingScheduleStartCapacity', Type='String',
                Default='2',
                Description='Worker ASG schedule start capacity'
            ), 'WorkerAutoScalingScheduleStartCapacity')

        self.worker_auto_scaling_schedule_end_recurrence = self.add_parameter(  # NOQA
            Parameter(
                'WorkerAutoScalingScheduleEndRecurrence', Type='String',
                Default='0 0 * * *',
                Description='Worker ASG schedule end recurrence'
            ), 'WorkerAutoScalingScheduleEndRecurrence')

        self.worker_auto_scaling_schedule_end_capacity = self.add_parameter(  # NOQA
            Parameter(
                'WorkerAutoScalingScheduleEndCapacity', Type='String',
                Default='0',
                Description='Worker ASG schedule end capacity'
            ), 'WorkerAutoScalingScheduleEndCapacity')

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

        self.srat_catchment_api_url = self.add_parameter(Parameter(
            'SRATCatchmentAPIURL', Type='String',
            Description='URL for the SRAT Catchment API'
        ), 'SRATCatchmentAPIURL')

        self.srat_catchment_api_key = self.add_parameter(Parameter(
            'SRATCatchmentAPIKey', Type='String', NoEcho=True,
            Description='API key for the SRAT Catchment API'
        ), 'SRATCatchmentAPIKey')

        worker_lb_security_group, \
            worker_security_group = self.create_security_groups()
        worker_lb = self.create_load_balancer(worker_lb_security_group)

        worker_auto_scaling_group = self.create_auto_scaling_resources(
            worker_security_group,
            worker_lb)

        self.create_cloud_watch_resources(worker_auto_scaling_group)

        self.create_dns_records(worker_lb)

        self.add_output(Output('WorkerLoadBalancerEndpoint',
                               Value=GetAtt(worker_lb, 'DNSName')))
        self.add_output(Output('WorkerLoadBalancerHostedZoneNameID',
                               Value=GetAtt(worker_lb,
                                            'CanonicalHostedZoneNameID')))

    def get_recent_worker_ami(self):
        try:
            worker_ami_id = self.get_input('WorkerAMI')
        except MKUnresolvableInputError:
            worker_ami_id = get_recent_ami(self.aws_profile,
                                           'mmw-worker-*')

        return worker_ami_id

    def create_security_groups(self):
        worker_lb_security_group_name = 'sgWorkerLoadBalancer'

        worker_lb_security_group = self.add_resource(ec2.SecurityGroup(
            worker_lb_security_group_name,
            GroupDescription='Enables access to workers via a load balancer',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=Ref(self.ip_access), FromPort=p,
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
            Tags=self.get_tags(Name=worker_lb_security_group_name)
        ))

        worker_security_group_name = 'sgWorker'

        worker_security_group = self.add_resource(ec2.SecurityGroup(
            worker_security_group_name,
            GroupDescription='Enables access to workers',
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
                for sg in [worker_lb_security_group]
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
            Tags=self.get_tags(Name=worker_security_group_name)
        ))

        return worker_lb_security_group, worker_security_group

    def create_load_balancer(self, worker_lb_security_group):
        worker_lb_name = 'elbWorker'

        return self.add_resource(elb.LoadBalancer(
            worker_lb_name,
            ConnectionDrainingPolicy=elb.ConnectionDrainingPolicy(
                Enabled=True,
                Timeout=300,
            ),
            CrossZone=True,
            SecurityGroups=[Ref(worker_lb_security_group)],
            Listeners=[
                elb.Listener(
                    LoadBalancerPort='80',
                    InstancePort='80',
                    Protocol='HTTP',
                )
            ],
            HealthCheck=elb.HealthCheck(
                Target='HTTP:80/',
                HealthyThreshold='3',
                UnhealthyThreshold='2',
                Interval='60',
                Timeout='10',
            ),
            Subnets=Ref(self.public_subnets),
            Tags=self.get_tags(Name=worker_lb_name)
        ))

    def create_auto_scaling_resources(self, worker_security_group, worker_lb):
        worker_launch_config_name = 'lcWorker'

        worker_launch_config = self.add_resource(
            asg.LaunchConfiguration(
                worker_launch_config_name,
                EbsOptimized=True,
                ImageId=Ref(self.worker_ami),
                IamInstanceProfile=Ref(self.worker_instance_profile),
                InstanceType=Ref(self.worker_instance_type),
                KeyName=Ref(self.keyname),
                SecurityGroups=[Ref(worker_security_group)],
                UserData=Base64(
                    Join('', self.get_cloud_config()))
            ))

        worker_auto_scaling_group_name = 'asgWorker'

        worker_asg = self.add_resource(
            asg.AutoScalingGroup(
                worker_auto_scaling_group_name,
                AvailabilityZones=Ref(self.availability_zones),
                Cooldown=300,
                DesiredCapacity=Ref(self.worker_auto_scaling_desired),
                HealthCheckGracePeriod=600,
                HealthCheckType='ELB',
                LaunchConfigurationName=Ref(worker_launch_config),
                LoadBalancerNames=[Ref(worker_lb)],
                MaxSize=Ref(self.worker_auto_scaling_max),
                MinSize=Ref(self.worker_auto_scaling_min),
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
                Tags=[asg.Tag('Name', 'Worker', True)]
            )
        )

        self.add_resource(
            asg.ScheduledAction(
                'schedWorkerAutoScalingStart',
                AutoScalingGroupName=Ref(worker_asg),
                DesiredCapacity=Ref(
                    self.worker_auto_scaling_schedule_start_capacity),
                Recurrence=Ref(
                    self.worker_auto_scaling_schedule_start_recurrence)
            )
        )

        self.add_resource(
            asg.ScheduledAction(
                'schedWorkerAutoScalingEnd',
                AutoScalingGroupName=Ref(worker_asg),
                DesiredCapacity=Ref(
                    self.worker_auto_scaling_schedule_end_capacity),
                Recurrence=Ref(
                    self.worker_auto_scaling_schedule_end_recurrence)
            )
        )

        return worker_asg

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
                '  - path: /etc/mmw.d/env/ROLLBAR_SERVER_SIDE_ACCESS_TOKEN\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', self.get_input('RollbarServerSideAccessToken'), '\n',  # NOQA
                '  - path: /etc/mmw.d/env/MMW_SRAT_CATCHMENT_API_URL\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.srat_catchment_api_url), '\n',
                '  - path: /etc/mmw.d/env/MMW_SRAT_CATCHMENT_API_KEY\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: ', Ref(self.srat_catchment_api_key), '\n',
                '  - path: /etc/fstab.rwd-data\n',
                '    permissions: 0440\n',
                '    owner: root:mmw\n',
                '    content: |\n',
                '      /dev/xvdf /opt/rwd-data\text4\tdefaults,nofail,discard\t0 2',  # NOQA
                '\n',
                'runcmd:\n',
                '  - cat /etc/fstab.rwd-data >> /etc/fstab\n',
                '  - mount -t ext4 /dev/xvdf /opt/rwd-data && initctl emit rwd-ready\n',  # NOQA
                '  - /opt/model-my-watershed/scripts/aws/ebs-warmer.sh']

    def create_cloud_watch_resources(self, worker_auto_scaling_group):
        self.add_resource(cw.Alarm(
            'alarmWorkerCPU',
            AlarmDescription='Worker scaling group high CPU',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Average',
            Period=300,
            Threshold='50',
            EvaluationPeriods=1,
            ComparisonOperator='GreaterThanThreshold',
            MetricName='CPUUtilization',
            Namespace='AWS/EC2',
            Dimensions=[
                cw.MetricDimension(
                    'metricAutoScalingGroupName',
                    Name='AutoScalingGroupName',
                    Value=Ref(worker_auto_scaling_group)
                )
            ]
        ))

    def create_dns_records(self, worker_lb):
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
                        GetAtt(worker_lb, 'CanonicalHostedZoneNameID'),
                        GetAtt(worker_lb, 'DNSName'),
                        True
                    ),
                    Name=Join('', ['blue-workers.',
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
                        GetAtt(worker_lb, 'CanonicalHostedZoneNameID'),
                        GetAtt(worker_lb, 'DNSName'),
                        True
                    ),
                    Name=Join('', ['green-workers.',
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
