import boto3


class AvailabilityZone(object):
    """Helper class that represents an availability zone

    We often only want 2 things from an AZ - a slug and name.
    This class keeps those in one location.
    """

    def __init__(self, availability_zone_name):
        """Creates an AvailabilityZoneHelper object

        Args:
        availability_zone_name (str): Name of the availability zone
        """

        self.availability_zone_name = availability_zone_name

    @property
    def cfn_name(self):
        """
        Utility method to return a string appropriate for CloudFormation
        name of a resource (e.g. UsEast1a)
        """
        return self.availability_zone_name.title().replace('-', '')

    @property
    def name(self):
        """Utility function to return the name of an availability zone"""
        return self.availability_zone_name


def get_availability_zones(aws_profile, zones=None):
    """Helper function that returns availability zones for a region

    Args:
      aws_profile (str): AWS profile name to use for authentication
      zones (list): Optional list of specific zone names to filter

    Returns:
      (list of AvailabilityZone): List of availability zones for a given
                                  EC2 region
    """
    session = boto3.Session(profile_name=aws_profile)
    ec2_client = session.client('ec2')
    
    filters = []
    if zones:
        filters.append({'Name': 'zone-name', 'Values': zones})
    
    response = ec2_client.describe_availability_zones(
        Filters=filters if filters else []
    )
    
    return [AvailabilityZone(az['ZoneName'])
            for az in response['AvailabilityZones']]


def get_subnet_cidr_block():
    """Generator to generate unique CIDR block subnets"""
    current = 0
    high = 255
    while current <= high:
        yield '10.0.%s.0/24' % current
        current += 1


def get_recent_ami(aws_profile, filters={}, owner='self', region='us-east-1',
                   executable_by='self'):
    session = boto3.Session(profile_name=aws_profile, region_name=region)
    ec2_client = session.client('ec2')

    # Convert filter dict to boto3 format
    boto3_filters = [{'Name': k, 'Values': [v] if isinstance(v, str) else v} 
                     for k, v in filters.items()]

    # Filter images by owned by self first
    try:
        response = ec2_client.describe_images(
            Owners=[owner],
            Filters=boto3_filters
        )
        images = response['Images']
    except Exception:
        images = []

    # If no images are owned by self, look for images self can execute
    if not images:
        response = ec2_client.describe_images(
            ExecutableUsers=[executable_by],
            Filters=boto3_filters
        )
        images = response['Images']

    # Make sure RC images are omitted from results
    images = [i for i in images if '.rc-' not in i.get('Name', '')]

    if not images:
        raise ValueError('No matching AMI found')

    return sorted(images, key=lambda i: i['CreationDate'],
                  reverse=True)[0]['ImageId']


def read_file(file_name):
    """Reads an entire file and returns it as a string

    Arguments
    :param file_name: A path to a file
    """
    with open(file_name, 'r') as f:
        return f.read()
