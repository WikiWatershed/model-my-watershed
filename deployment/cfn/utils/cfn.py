import boto


class AvailabilityZone(object):
    """Helper class that represents an availability zone

    We often only want 2 things from an AZ - a slug and name.
    This class keeps those in one location.
    """

    def __init__(self, availability_zone):
        """Creates an AvailabilityZoneHelper object

        Args:
        availability_zone (AvailabilityZone): boto object
        """

        self.availability_zone = availability_zone

    @property
    def cfn_name(self):
        """
        Utility method to return a string appropriate for CloudFormation
        name of a resource (e.g. UsEast1a)
        """
        return self.availability_zone.name.title().replace('-', '')

    @property
    def name(self):
        """Utility function to return the name of an availability zone"""
        return self.availability_zone.name


def get_availability_zones(aws_profile):
    """Helper function that returns availability zones for a region

    Returns:
      (list of AvailabilityZone): List of availability zones for a given
                                  EC2 region
    """
    conn = boto.connect_ec2(profile_name=aws_profile)
    return [AvailabilityZone(az) for az in conn.get_all_zones()]


def get_subnet_cidr_block():
    """Generator to generate unique CIDR block subnets"""
    current = 0
    high = 255
    while current <= high:
        yield '10.0.%s.0/24' % current
        current += 1


def get_recent_ami(aws_profile, ami_name, owner="self"):
    conn = boto.connect_ec2(profile_name=aws_profile)
    images = conn.get_all_images(owners=owner, filters={
        'name': ami_name
    })

    return sorted(filter(lambda i: True if 'beta' not in i.name else False,
                         images),
                  key=lambda i: i.name, reverse=True)[0].id


def read_file(file_name):
    """Reads an entire file and returns it as a string

    Arguments
    :param file_name: A path to a file
    """
    with open(file_name, 'r') as f:
        return f.read()
