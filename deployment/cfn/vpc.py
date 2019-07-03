from troposphere import (
    Parameter,
    Ref,
    Output,
    Tags,
    Join,
    ec2
)

from utils.cfn import (
    get_availability_zones,
    get_recent_ami,
    get_subnet_cidr_block
)

from utils.constants import (
    ALLOW_ALL_CIDR,
    EC2_INSTANCE_TYPES,
    HTTP,
    HTTPS,
    VPC_CIDR
)

from majorkirby import StackNode, MKUnresolvableInputError


class VPC(StackNode):
    INPUTS = {
        'Tags': ['global:Tags'],
        'Region': ['global:Region'],
        'StackType': ['global:StackType'],
        'KeyName': ['global:KeyName'],
        'AvailabilityZones': ['global:AvailabilityZones'],
        'PublicSubnets': ['global:PublicSubnets'],
        'PrivateSubnets': ['global:PrivateSubnets'],
        'NATInstanceType': ['global:NATInstanceType'],
        'NATInstanceAMI': ['global:NATInstanceAMI'],
        'PapertrailPort': ['global:PapertrailPort'],
    }

    DEFAULTS = {
        'Tags': {},
        'Region': 'us-east-1',
        'StackType': 'Staging',
        'KeyName': 'mmw-stg',
        'AvailabilityZones': 'us-east-1b,us-east-1d',
        'PublicSubnets': '10.0.2.0/24,10.0.4.0/24',
        'PrivateSubnets': '10.0.3.0/24,10.0.5.0/24',
        'NATInstanceType': 't2.micro',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    _NAT_SECURITY_GROUP_CACHE = None

    def set_up_stack(self):
        super(VPC, self).set_up_stack()

        self.default_tags = self.get_input('Tags').copy()
        self.region = self.get_input('Region')
        self.availability_zones = get_availability_zones(self.aws_profile,
                                                         self.get_input('AvailabilityZones').split(','))
        self.public_subnets = iter(self.get_input('PublicSubnets').split(','))
        self.private_subnets = iter(
            self.get_input('PrivateSubnets').split(','))

        self.add_description('VPC stack for MMW')

        # Parameters
        self.keyname = self.add_parameter(Parameter(
            'KeyName', Type='String',
            Description='Name of an existing EC2 key pair'
        ), 'KeyName')

        self.nat_instance_type = self.add_parameter(Parameter(
            'NATInstanceType', Type='String', Default='t2.micro',
            Description='NAT EC2 instance type',
            AllowedValues=EC2_INSTANCE_TYPES,
            ConstraintDescription='must be a valid EC2 instance type.'
        ), 'NATInstanceType')

        self.nat_instance_ami = self.add_parameter(Parameter(
            'NATInstanceAMI', Type='String', Default=self.get_recent_nat_ami(),
            Description='NAT EC2 Instance AMI'
        ), 'NATInstanceAMI')

        self.papertrail_port = self.add_parameter(Parameter(
            'PapertrailPort', Type='String',
            Description='Port for Papertrail log destination',
        ), 'PapertrailPort')

        public_route_table = self.create_vpc()

        self.add_output(Output('AvailabilityZones',
                               Value=','.join(self.default_azs)))
        self.add_output(Output('PrivateSubnets',
                               Value=Join(',', map(Ref, self.default_private_subnets))))  # NOQA
        self.add_output(Output('PublicSubnets',
                               Value=Join(',', map(Ref, self.default_public_subnets))))  # NOQA
        self.add_output(Output('RouteTableId', Value=Ref(public_route_table)))

    def get_recent_nat_ami(self):
        try:
            nat_ami_id = self.get_input('NATInstanceAMI')
        except MKUnresolvableInputError:
            filters = {'name': '*ami-vpc-nat-hvm*'}

            nat_ami_id = get_recent_ami(self.aws_profile, filters=filters,
                                        region=self.region, owner='amazon')

        return nat_ami_id

    def create_vpc(self):
        vpc_name = 'MMWVPC'

        self.vpc = self.create_resource(ec2.VPC(
            vpc_name,
            CidrBlock=VPC_CIDR, EnableDnsSupport=True,
            EnableDnsHostnames=True, Tags=self.get_tags(Name=vpc_name)
        ), output='VpcId')

        public_route_table = self.create_routing_resources()
        self.create_subnets(public_route_table)

        return public_route_table

    def create_routing_resources(self):
        gateway = self.create_resource(
            ec2.InternetGateway(
                'InternetGateway',
                Tags=self.get_tags()
            )
        )

        gateway_attachment = self.create_resource(
            ec2.VPCGatewayAttachment(
                'VPCGatewayAttachment',
                VpcId=Ref(self.vpc),
                InternetGatewayId=Ref(gateway)
            )
        )

        public_route_table = self.create_resource(
            ec2.RouteTable(
                'PublicRouteTable',
                VpcId=Ref(self.vpc))
        )

        self.create_resource(
            ec2.Route(
                'PublicRoute',
                RouteTableId=Ref(public_route_table),
                DestinationCidrBlock=ALLOW_ALL_CIDR,
                DependsOn=gateway_attachment.title,
                GatewayId=Ref(gateway)
            )
        )

        return public_route_table

    def create_subnets(self, public_route_table):
        self.default_azs = []
        self.default_private_subnets = []
        self.default_public_subnets = []

        for num, availability_zone in enumerate(self.availability_zones):
            public_subnet_name = '{}PublicSubnet'.format(availability_zone.cfn_name)  # NOQA

            public_subnet = self.create_resource(ec2.Subnet(
                public_subnet_name,
                VpcId=Ref(self.vpc),
                CidrBlock=next(self.public_subnets),
                AvailabilityZone=availability_zone.name,
                Tags=self.get_tags(Name=public_subnet_name)
            ))

            self.create_resource(ec2.SubnetRouteTableAssociation(
                '{}PublicRouteTableAssociation'.format(public_subnet.title),
                SubnetId=Ref(public_subnet),
                RouteTableId=Ref(public_route_table)
            ))

            private_subnet_name = '{}PrivateSubnet'.format(availability_zone.cfn_name)  # NOQA

            private_subnet = self.create_resource(ec2.Subnet(
                private_subnet_name,
                VpcId=Ref(self.vpc),
                CidrBlock=next(self.private_subnets),
                AvailabilityZone=availability_zone.name,
                Tags=self.get_tags(Name=private_subnet_name)
            ))

            private_route_table_name = '{}PrivateRouteTable'.format(availability_zone.cfn_name)  # NOQA

            private_route_table = self.create_resource(ec2.RouteTable(
                private_route_table_name,
                VpcId=Ref(self.vpc),
                Tags=self.get_tags(Name=private_route_table_name)
            ))

            self.create_resource(ec2.SubnetRouteTableAssociation(
                '{}PrivateSubnetRouteTableAssociation'.format(private_subnet.title),  # NOQA
                SubnetId=Ref(private_subnet),
                RouteTableId=Ref(private_route_table)
            ))

            if availability_zone.name in self.get_input('AvailabilityZones').split(','):  # NOQA
                self.create_nat(availability_zone, public_subnet,
                                private_route_table)
                self.default_azs.append(availability_zone.name)
                self.default_private_subnets.append(private_subnet)
                self.default_public_subnets.append(public_subnet)

    def create_nat(self, availability_zone, public_subnet, private_route_table):  # NOQA
        nat_device_name = '{}NATDevice'.format(availability_zone.cfn_name)

        nat_device = self.create_resource(ec2.Instance(
            nat_device_name,
            InstanceType=Ref(self.nat_instance_type),
            KeyName=Ref(self.keyname),
            SourceDestCheck=False,
            ImageId=Ref(self.nat_instance_ami),
            NetworkInterfaces=[
                ec2.NetworkInterfaceProperty(
                    Description='ENI for NATDevice',
                    GroupSet=[Ref(self.nat_security_group)],
                    SubnetId=Ref(public_subnet),
                    AssociatePublicIpAddress=True,
                    DeviceIndex=0,
                    DeleteOnTermination=True,
                )
            ],
            Tags=self.get_tags(Name=nat_device_name)
        ))

        self.create_resource(ec2.Route(
            '{}PrivateRoute'.format(availability_zone.cfn_name),
            RouteTableId=Ref(private_route_table),
            DestinationCidrBlock=ALLOW_ALL_CIDR,
            InstanceId=Ref(nat_device))
        )

    @property
    def nat_security_group(self):
        if self._NAT_SECURITY_GROUP_CACHE:
            return self._NAT_SECURITY_GROUP_CACHE
        else:
            nat_security_group_name = 'sgNAT'

            self._NAT_SECURITY_GROUP_CACHE = self.create_resource(
                ec2.SecurityGroup(nat_security_group_name,
                                  GroupDescription='Enables access to the NAT '
                                                   'devices',
                                  VpcId=Ref(self.vpc),
                                  SecurityGroupIngress=[
                                      ec2.SecurityGroupRule(
                                          IpProtocol='tcp', CidrIp=VPC_CIDR,
                                          FromPort=p, ToPort=p
                                      )
                                      for p in [HTTP, HTTPS, self.get_input('PapertrailPort')]
                                  ],
                                  SecurityGroupEgress=[
                                      ec2.SecurityGroupRule(
                                          IpProtocol='tcp',
                                          CidrIp=ALLOW_ALL_CIDR,
                                          FromPort=port, ToPort=port
                                      ) for port in [HTTP, HTTPS, self.get_input('PapertrailPort')]
                                  ],
                                  Tags=self.get_tags(Name=nat_security_group_name)),  # NOQA
                                  'NATSecurityGroup'
            )
            return self._NAT_SECURITY_GROUP_CACHE

    def create_resource(self, resource, output=None):
        """Helper method to attach resource to template and return it

        This helper method is used when adding _any_ CloudFormation resource
        to the template. It abstracts out the creation of the resource, adding
        it to the template, and optionally adding it to the outputs as well

        Args:
          resource: Troposphere resource to create
          output: Name of output to return this value as
        """
        resource = self.add_resource(resource)

        if output:
            cloudformation_output = Output(
                output,
                Value=Ref(resource)
            )

            self.add_output(cloudformation_output)

        return resource

    def get_tags(self, **kwargs):
        """Helper method to return Troposphere tags + default tags

        Args:
          **kwargs: arbitrary keyword arguments to be used as tags
        """
        kwargs.update(self.default_tags)
        return Tags(**kwargs)
