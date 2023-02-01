from troposphere import (
    Parameter,
    Ref,
    Tags,
    Join,
    GetAtt,
    Select,
    cloudwatch,
    ec2,
    elasticache as ec,
    rds,
    route53 as r53
)

from cfn.utils.cfn import get_recent_ami

from cfn.utils.constants import (
    ALLOW_ALL_CIDR,
    CANONICAL_ACCOUNT_ID,
    EC2_INSTANCE_TYPES,
    ELASTICACHE_INSTANCE_TYPES,
    HTTP,
    HTTPS,
    POSTGRESQL,
    RDS_INSTANCE_TYPES,
    REDIS,
    SSH,
    VPC_CIDR
)

from majorkirby import StackNode, MKUnresolvableInputError


class DataPlane(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'KeyName': ['global:KeyName'],
        'IPAccess': ['global:IPAccess'],
        'AvailabilityZones': ['global:AvailabilityZones',
                              'VPC:AvailabilityZones'],
        'BastionHostInstanceType': ['global:BastionHostInstanceType'],
        'BastionHostAMI': ['global:BastionHostAMI'],
        'RDSInstanceType': ['global:RDSInstanceType'],
        'RDSDbName': ['global:RDSDbName'],
        'RDSUsername': ['global:RDSUsername'],
        'RDSPassword': ['global:RDSPassword'],
        'ECInstanceType': ['global:ECInstanceType'],
        'PublicSubnets': ['global:PublicSubnets', 'VPC:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets', 'VPC:PrivateSubnets'],
        'PublicHostedZoneName': ['global:PublicHostedZoneName'],
        'PrivateHostedZoneId': ['global:PrivateHostedZoneId',
                                'PrivateHostedZone:PrivateHostedZoneId'],
        'PrivateHostedZoneName': ['global:PrivateHostedZoneName'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'GlobalNotificationsARN': ['global:GlobalNotificationsARN'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'KeyName': 'mmw-stg',
        'IPAccess': ALLOW_ALL_CIDR,
        'BastionHostInstanceType': 't2.medium',
        'RDSInstanceType': 'db.t3.micro',
        'RDSDbName': 'modelmywatershed',
        'RDSUsername': 'modelmywatershed',
        'RDSPassword': 'modelmywatershed',
        'ECInstanceType': 'cache.m1.small',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def set_up_stack(self):
        super(DataPlane, self).set_up_stack()

        self.default_tags = self.get_input('Tags').copy()
        self.region = self.get_input('Region')

        self.add_description('Data plane stack for MMW')

        # Parameters
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

        self.bastion_instance_type = self.add_parameter(Parameter(
            'BastionHostInstanceType', Type='String', Default='t2.medium',
            Description='Bastion host EC2 instance type',
            AllowedValues=EC2_INSTANCE_TYPES,
            ConstraintDescription='must be a valid EC2 instance type.'
        ), 'BastionHostInstanceType')

        self.bastion_host_ami = self.add_parameter(Parameter(
            'BastionHostAMI', Type='String',
            Default=self.get_recent_bastion_ami(),
            Description='Bastion host AMI'
        ), 'BastionHostAMI')

        self.rds_instance_type = self.add_parameter(Parameter(
            'RDSInstanceType', Type='String', Default='db.t3.micro',
            Description='RDS instance type', AllowedValues=RDS_INSTANCE_TYPES,
            ConstraintDescription='must be a valid RDS instance type.'
        ), 'RDSInstanceType')

        self.rds_db_name = self.add_parameter(Parameter(
            'RDSDbName', Type='String', Description='Database name'
        ), 'RDSDbName')

        self.rds_parameter_group_name = self.add_parameter(Parameter(
            'RDSParameterGroupName', Type='String', Description='Parameter group name'
        ), 'RDSParameterGroupName')

        self.rds_username = self.add_parameter(Parameter(
            'RDSUsername', Type='String', Description='Database username'
        ), 'RDSUsername')

        self.rds_password = self.add_parameter(Parameter(
            'RDSPassword', Type='String', NoEcho=True,
            Description='Database password',
        ), 'RDSPassword')

        self.rds_multi_az = self.add_parameter(Parameter(
            'RDSMultiAZ', Type='String', Description='Multi-AZ',
            AllowedValues=['True', 'False']
        ), 'RDSMultiAZ')

        self.elasticache_instance_type = self.add_parameter(Parameter(
            'ECInstanceType', Type='String', Default='cache.m1.small',
            Description='ElastiCache instance type',
            AllowedValues=ELASTICACHE_INSTANCE_TYPES,
            ConstraintDescription='must be a valid ElastiCache instance type.'
        ), 'ECInstanceType')

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

        self.private_hosted_zone_id = self.add_parameter(Parameter(
            'PrivateHostedZoneId', Type='String',
            Description='Route 53 private hosted zone ID'
        ), 'PrivateHostedZoneId')

        self.private_hosted_zone_name = self.add_parameter(Parameter(
            'PrivateHostedZoneName', Type='String',
            Description='Route 53 private hosted zone name'
        ), 'PrivateHostedZoneName')

        self.vpc_id = self.add_parameter(Parameter(
            'VpcId', Type='String',
            Description='VPC ID'
        ), 'VpcId')

        self.notification_topic_arn = self.add_parameter(Parameter(
            'GlobalNotificationsARN', Type='String',
            Description='ARN for an SNS topic to broadcast notifications'
        ), 'GlobalNotificationsARN')

        bastion_host = self.create_bastion()

        rds_database = self.create_rds_instance()
        self.create_rds_cloudwatch_alarms(rds_database)

        elasticache_group = self.create_elasticache_replication_group()
        self.create_elasticache_cloudwatch_alarms(elasticache_group)

        self.create_dns_records(bastion_host, rds_database, elasticache_group)

    def get_recent_bastion_ami(self):
        try:
            bastion_ami_id = self.get_input('BastionHostAMI')
        except MKUnresolvableInputError:
            filters = {'name':
                       'ubuntu/images/hvm-ssd/ubuntu-focal-20.04-amd64-server-*',
                       'architecture': 'x86_64',
                       'block-device-mapping.volume-type': 'gp2',
                       'root-device-type': 'ebs',
                       'virtualization-type': 'hvm'}

            bastion_ami_id = get_recent_ami(self.aws_profile, filters,
                                            region=self.region,
                                            owner=CANONICAL_ACCOUNT_ID)

        return bastion_ami_id

    def create_bastion(self):
        bastion_security_group_name = 'sgBastion'
        bastion_security_group = self.add_resource(ec2.SecurityGroup(
            bastion_security_group_name,
            GroupDescription='Enables access to the BastionHost',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(IpProtocol='tcp',
                                      CidrIp=Ref(self.ip_access),
                                      FromPort=p, ToPort=p)
                for p in [SSH]
            ],
            SecurityGroupEgress=[
                ec2.SecurityGroupRule(IpProtocol='tcp',
                                      CidrIp=VPC_CIDR,
                                      FromPort=p, ToPort=p)
                for p in [POSTGRESQL, REDIS, SSH]
            ] + [
                ec2.SecurityGroupRule(IpProtocol='tcp',
                                      CidrIp=ALLOW_ALL_CIDR,
                                      FromPort=p, ToPort=p)
                for p in [HTTP, HTTPS]
            ],
            Tags=self.get_tags(Name=bastion_security_group_name)
        ))

        bastion_host_name = 'BastionHost'
        return self.add_resource(ec2.Instance(
            bastion_host_name,
            InstanceType=Ref(self.bastion_instance_type),
            KeyName=Ref(self.keyname),
            ImageId=Ref(self.bastion_host_ami),
            NetworkInterfaces=[
                ec2.NetworkInterfaceProperty(
                    Description='ENI for BastionHost',
                    GroupSet=[Ref(bastion_security_group)],
                    SubnetId=Select('0', Ref(self.public_subnets)),
                    AssociatePublicIpAddress=True,
                    DeviceIndex=0,
                    DeleteOnTermination=True
                )
            ],
            Tags=self.get_tags(Name=bastion_host_name)
        ))

    def create_rds_instance(self):
        rds_security_group_name = 'sgDatabaseServer'

        rds_security_group = self.add_resource(ec2.SecurityGroup(
            rds_security_group_name,
            GroupDescription='Enables access to database servers',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [POSTGRESQL]
            ],
            SecurityGroupEgress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [POSTGRESQL]
            ],
            Tags=self.get_tags(Name=rds_security_group_name)
        ))

        rds_subnet_group_name = 'dbsngDatabaseServer'

        rds_subnet_group = self.add_resource(rds.DBSubnetGroup(
            rds_subnet_group_name,
            DBSubnetGroupDescription='Private subnets for the RDS instances',
            SubnetIds=Ref(self.private_subnets),
            Tags=self.get_tags(Name=rds_subnet_group_name)
        ))

        rds_database_name = 'DatabaseServer'

        return self.add_resource(rds.DBInstance(
            rds_database_name,
            AllocatedStorage=128,
            AllowMajorVersionUpgrade=False,
            AutoMinorVersionUpgrade=True,
            BackupRetentionPeriod=30,
            DBInstanceClass=Ref(self.rds_instance_type),
            DBName=Ref(self.rds_db_name),
            DBParameterGroupName=Ref(self.rds_parameter_group_name),
            DBSubnetGroupName=Ref(rds_subnet_group),
            Engine='postgres',
            EngineVersion='13.4',
            MasterUsername=Ref(self.rds_username),
            MasterUserPassword=Ref(self.rds_password),
            MultiAZ=Ref(self.rds_multi_az),
            PreferredBackupWindow='04:00-04:30',  # 12:00AM-12:30AM ET
            PreferredMaintenanceWindow='sun:04:30-sun:05:30',  # SUN 12:30AM-01:30AM ET
            StorageType='gp2',
            VPCSecurityGroups=[Ref(rds_security_group)],
            Tags=self.get_tags(Name=rds_database_name)
        ))

    def create_rds_cloudwatch_alarms(self, rds_database):
        self.add_resource(cloudwatch.Alarm(
            'alarmDatabaseServerCPUUtilization',
            AlarmDescription='Database server CPU utilization',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Average',
            Period=300,
            Threshold='75',
            EvaluationPeriods=1,
            ComparisonOperator='GreaterThanThreshold',
            MetricName='CPUUtilization',
            Namespace='AWS/RDS',
            Dimensions=[
                cloudwatch.MetricDimension(
                    'metricDatabaseServerName',
                    Name='DBInstanceIdentifier',
                    Value=Ref(rds_database)
                )
            ],
        ))

        self.add_resource(cloudwatch.Alarm(
            'alarmDatabaseServerDiskQueueDepth',
            AlarmDescription='Database server disk queue depth',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Average',
            Period=60,
            Threshold='10',
            EvaluationPeriods=1,
            ComparisonOperator='GreaterThanThreshold',
            MetricName='DiskQueueDepth',
            Namespace='AWS/RDS',
            Dimensions=[
                cloudwatch.MetricDimension(
                    'metricDatabaseServerName',
                    Name='DBInstanceIdentifier',
                    Value=Ref(rds_database)
                )
            ],
        ))

        self.add_resource(cloudwatch.Alarm(
            'alarmDatabaseServerFreeStorageSpace',
            AlarmDescription='Database server free storage space',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Average',
            Period=60,
            Threshold=str(int(5.0e+09)),  # 5GB in bytes
            EvaluationPeriods=1,
            ComparisonOperator='LessThanThreshold',
            MetricName='FreeStorageSpace',
            Namespace='AWS/RDS',
            Dimensions=[
                cloudwatch.MetricDimension(
                    'metricDatabaseServerName',
                    Name='DBInstanceIdentifier',
                    Value=Ref(rds_database)
                )
            ],
        ))

        self.add_resource(cloudwatch.Alarm(
            'alarmDatabaseServerFreeableMemory',
            AlarmDescription='Database server freeable memory',
            AlarmActions=[Ref(self.notification_topic_arn)],
            Statistic='Average',
            Period=60,
            Threshold=str(int(1.28e+08)),  # 128MB in bytes
            EvaluationPeriods=1,
            ComparisonOperator='LessThanThreshold',
            MetricName='FreeableMemory',
            Namespace='AWS/RDS',
            Dimensions=[
                cloudwatch.MetricDimension(
                    'metricDatabaseServerName',
                    Name='DBInstanceIdentifier',
                    Value=Ref(rds_database)
                )
            ],
        ))

    def create_elasticache_replication_group(self):
        elasticache_security_group_name = 'sgCacheCluster'

        elasticache_security_group = self.add_resource(ec2.SecurityGroup(
            elasticache_security_group_name,
            GroupDescription='Enables access to the cache cluster',
            VpcId=Ref(self.vpc_id),
            SecurityGroupIngress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [REDIS]
            ],
            SecurityGroupEgress=[
                ec2.SecurityGroupRule(
                    IpProtocol='tcp', CidrIp=VPC_CIDR, FromPort=p, ToPort=p
                )
                for p in [REDIS]
            ],
            Tags=self.get_tags(Name=elasticache_security_group_name)
        ))

        elasticache_subnet_group = self.add_resource(ec.SubnetGroup(
            'ecsngCacheCluster',
            Description='Private subnets for the ElastiCache instances',
            SubnetIds=Ref(self.private_subnets)
        ))

        elasticache_parameter_group = self.add_resource(ec.ParameterGroup(
            'ecpgCacheCluster',
            CacheParameterGroupFamily='redis5.0',
            Description='Parameter group for the ElastiCache instances',
            Properties={'maxmemory-policy': 'allkeys-lru'}
        ))

        return self.add_resource(ec.ReplicationGroup(
            'CacheReplicationGroup',
            AutomaticFailoverEnabled=True,
            AutoMinorVersionUpgrade=True,
            CacheNodeType=Ref(self.elasticache_instance_type),
            CacheParameterGroupName=Ref(elasticache_parameter_group),
            CacheSubnetGroupName=Ref(elasticache_subnet_group),
            Engine='redis',
            EngineVersion='5.0.6',
            NotificationTopicArn=Ref(self.notification_topic_arn),
            NumCacheClusters=2,
            PreferredCacheClusterAZs=Ref(self.availability_zones),
            PreferredMaintenanceWindow='sun:05:00-sun:06:00',  # SUN 01:00AM-02:00AM ET
            ReplicationGroupDescription='Redis replication group',
            SecurityGroupIds=[Ref(elasticache_security_group)],
            SnapshotRetentionLimit=30,
            SnapshotWindow='04:00-05:00'  # 12:00AM-01:00AM ET
        ))

    def create_elasticache_cloudwatch_alarms(self, elasticache_cache_cluster):
        for index in [1, 2]:
            self.add_resource(cloudwatch.Alarm(
                'alarmCacheCluster{0:0>3}CPUUtilization'.format(index),
                AlarmDescription='Cache cluster CPU utilization',
                AlarmActions=[Ref(self.notification_topic_arn)],
                Statistic='Average',
                Period=300,
                Threshold='75',
                EvaluationPeriods=1,
                ComparisonOperator='GreaterThanThreshold',
                MetricName='CPUUtilization',
                Namespace='AWS/ElastiCache',
                Dimensions=[
                    cloudwatch.MetricDimension(
                        'metricCacheClusterName',
                        Name='CacheClusterId',
                        Value=Join('-',
                                   [Ref(elasticache_cache_cluster),
                                    '{0:0>3}'.format(index)])
                    )
                ],
            ))

            self.add_resource(cloudwatch.Alarm(
                'alarmCacheCluster{0:0>3}FreeableMemory'.format(index),
                AlarmDescription='Cache cluster freeable memory',
                AlarmActions=[Ref(self.notification_topic_arn)],
                Statistic='Average',
                Period=60,
                Threshold=str(int(5e+06)),  # 5MB in bytes
                EvaluationPeriods=1,
                ComparisonOperator='LessThanThreshold',
                MetricName='FreeableMemory',
                Namespace='AWS/ElastiCache',
                Dimensions=[
                    cloudwatch.MetricDimension(
                        'metricCacheClusterName',
                        Name='CacheClusterId',
                        Value=Join('-',
                                   [Ref(elasticache_cache_cluster),
                                    '{0:0>3}'.format(index)])
                    )
                ],
            ))

    def create_dns_records(self, bastion_host, rds_database,
                           elasticache_group):
        self.add_resource(r53.RecordSetGroup(
            'dnsPublicRecords',
            HostedZoneName=Join('', [Ref(self.public_hosted_zone_name), '.']),
            RecordSets=[
                r53.RecordSet(
                    'dnsBastionServer',
                    Name=Join('', ['bastion.',
                                   Ref(self.public_hosted_zone_name), '.']),
                    Type='A',
                    TTL='300',
                    ResourceRecords=[GetAtt(bastion_host, 'PublicIp')]
                )
            ]
        ))

        self.add_resource(r53.RecordSetGroup(
            'dnsPrivateRecords',
            HostedZoneId=Ref(self.private_hosted_zone_id),
            RecordSets=[
                r53.RecordSet(
                    'dnsDatabaseServer',
                    Name=Join('', ['database.service.',
                                   Ref(self.private_hosted_zone_name), '.']),
                    Type='CNAME',
                    TTL='10',
                    ResourceRecords=[
                        GetAtt(rds_database, 'Endpoint.Address')
                    ]
                ),
                r53.RecordSet(
                    'dnsCacheServer',
                    Name=Join('', ['cache.service.',
                                   Ref(self.private_hosted_zone_name), '.']),
                    Type='CNAME',
                    TTL='10',
                    ResourceRecords=[
                        GetAtt(elasticache_group, 'PrimaryEndPoint.Address')
                    ]
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
