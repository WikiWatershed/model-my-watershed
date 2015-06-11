from boto.vpc import VPCConnection
from boto.ec2.regioninfo import RegionInfo
from boto.ec2.ec2object import TaggedEC2Object

from majorkirby import CustomActionNode


class RouteTables(list):
    """Represents a list of route tables"""
    def startElement(self, name, attrs, connection):
        pass

    def endElement(self, name, value, connection):
        if name == 'item':
            self.append(value)


class VPCEndpoint(TaggedEC2Object):
    """Represents a VPC endpoint"""
    def __init__(self, connection=None):
        super(VPCEndpoint, self).__init__(connection)
        self.id = None
        self.vpc_id = None
        self.state = None
        self.route_tables = RouteTables()
        self.policy_document = None
        self.service_name = None

    def __repr__(self):
        return 'VPCEndpoint:%s' % self.id

    def startElement(self, name, attrs, connection):
        retval = super(VPCEndpoint, self).startElement(name, attrs, connection)
        if retval is not None:
            return retval
        if name == 'routeTableIdSet':
            return self.route_tables
        else:
            return None

    def endElement(self, name, value, connection):
        if name == 'vpcEndpointId':
            self.id = value
        elif name == 'vpcId':
            self.vpc_id = value
        elif name == 'state':
            self.state = value
        elif name == 'policyDocument':
            self.policy_document = value
        elif name == 'serviceName':
            self.service_name = value
        else:
            setattr(self, name, value)


class CustomVPCConnection(VPCConnection):
    """Represents a custom VPC connection"""
    def __init__(self, region='us-east-1', api_version='2015-04-15', **kwargs):
        region_info = RegionInfo(self, region,
                                 'ec2.{}.amazonaws.com'.format(region))
        super(CustomVPCConnection, self).__init__(api_version=api_version,
                                                  region=region_info, **kwargs)

    def get_vpc_endpoint(self, vpc_id, route_table_id):
        """Gets a VPC endpoint by ID and associated route table ID"""
        vpc_endpoints = self.get_list('DescribeVpcEndpoints', {},
                                      [('item', VPCEndpoint)], verb='POST')

        for vpc_endpoint in vpc_endpoints:
            if (vpc_endpoint.vpc_id == vpc_id and
                    vpc_endpoint.route_tables[0] == route_table_id):
                return vpc_endpoint

        return None

    def create_vpc_endpoint(self, vpc_id, route_table_id, service_name):
        """Creates a VPC endpoint in the VPC and ties it with a route table"""
        params = {'VpcId': vpc_id, 'RouteTableId.1': route_table_id,
                  'ServiceName': service_name}
        return self.get_object('CreateVpcEndpoint', params, VPCEndpoint,
                               verb='POST')


class S3VPCEndpoint(CustomActionNode):
    """Represents a VPC endpoint for Amazon S3"""
    INPUTS = {
        'Region': ['global:Region'],
        'VpcId': ['global:VpcId', 'VPC:VpcId'],
        'RouteTableId': ['global:RouteTableId', 'VPC:RouteTableId'],
        'StackType': ['global:StackType'],
    }

    DEFAULTS = {
        'Region': 'us-east-1',
        'StackType': 'Staging',
    }

    ATTRIBUTES = {'StackType': 'StackType'}

    def action(self):
        region = self.get_input('Region')
        vpc_id = self.get_input('VpcId')
        route_table_id = self.get_input('RouteTableId')

        conn = CustomVPCConnection(region=region,
                                   profile_name=self.aws_profile)
        vpc_endpoint = conn.get_vpc_endpoint(vpc_id, route_table_id)

        if vpc_endpoint is None:
            conn.create_vpc_endpoint(vpc_id, route_table_id,
                                     self.get_service_name(region))

    def get_service_name(self, region):
        return 'com.amazonaws.{}.s3'.format(region)
