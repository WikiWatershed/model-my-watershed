import boto3

from majorkirby import CustomActionNode


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
        service_name = self.get_service_name(region)

        session = boto3.Session(profile_name=self.aws_profile,
                                region_name=region)
        ec2_client = session.client('ec2')

        # Check if VPC endpoint already exists
        vpc_endpoint = self._get_vpc_endpoint(ec2_client, vpc_id,
                                              route_table_id, service_name)

        if vpc_endpoint is None:
            # Create VPC endpoint
            ec2_client.create_vpc_endpoint(
                VpcId=vpc_id,
                ServiceName=service_name,
                RouteTableIds=[route_table_id]
            )

    def _get_vpc_endpoint(self, ec2_client, vpc_id,
                          route_table_id, service_name):
        """Gets a VPC endpoint by VPC ID, route table ID, and service name"""
        response = ec2_client.describe_vpc_endpoints(
            Filters=[
                {'Name': 'vpc-id', 'Values': [vpc_id]},
                {'Name': 'service-name', 'Values': [service_name]}
            ]
        )

        for endpoint in response.get('VpcEndpoints', []):
            if route_table_id in endpoint.get('RouteTableIds', []):
                return endpoint

        return None

    def get_service_name(self, region):
        return 'com.amazonaws.{}.s3'.format(region)
