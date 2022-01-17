from majorkirby import GlobalConfigNode

from cfn.vpc import VPC
from cfn.s3_vpc_endpoint import S3VPCEndpoint
from cfn.private_hosted_zone import PrivateHostedZone
from cfn.data_plane import DataPlane
from cfn.application import Application
from cfn.tiler import Tiler
from cfn.tile_delivery_network import TileDeliveryNetwork
from cfn.worker import Worker
from cfn.public_hosted_zone import PublicHostedZone

from boto import cloudformation as cfn

import configparser
import sys


def get_config(mmw_config_path, profile):
    """Parses a configuration file

    Arguments
    :param mmw_config_path: Path to the config file
    :param profile: Config profile to read
    """
    mmw_config = configparser.ConfigParser()
    mmw_config.optionxform = str
    mmw_config.read(mmw_config_path)

    try:
        section = mmw_config.items(profile)
    except configparser.NoSectionError:
        sys.stderr.write('There is no section [{}] in the configuration '
                         'file\n'.format(profile))
        sys.stderr.write('you specified. Did you specify the correct file?')
        sys.exit(1)

    return {k: v.strip('"').strip("'") for k, v in section}


def build_graph(mmw_config, aws_profile, **kwargs):
    """
    Builds graphs for all of the MMW stacks
    Args:
      mmw_config (dict): dictionary representation of `default.yml`
      aws_profile (str): name of AWS profile to use for authentication
    """

    if kwargs['stack_color'] is not None:
        mmw_config['StackColor'] = kwargs['stack_color'].capitalize()

    global_config = GlobalConfigNode(**mmw_config)
    vpc = VPC(globalconfig=global_config, aws_profile=aws_profile)
    s3_vpc_endpoint = S3VPCEndpoint(globalconfig=global_config, VPC=vpc,
                                    aws_profile=aws_profile)
    private_hosted_zone = PrivateHostedZone(globalconfig=global_config,
                                            VPC=vpc, aws_profile=aws_profile)
    data_plane = DataPlane(globalconfig=global_config, VPC=vpc,
                           PrivateHostedZone=private_hosted_zone,
                           aws_profile=aws_profile)

    tiler = Tiler(globalconfig=global_config, VPC=vpc, aws_profile=aws_profile,
                  DataPlane=data_plane)
    tile_delivery_network = TileDeliveryNetwork(globalconfig=global_config,
                                                VPC=vpc,
                                                PrivateHostedZone=private_hosted_zone,  # NOQA
                                                aws_profile=aws_profile)
    application = Application(globalconfig=global_config, VPC=vpc,
                              DataPlane=data_plane,
                              TileDeliveryNetwork=tile_delivery_network,
                              aws_profile=aws_profile)
    worker = Worker(globalconfig=global_config, VPC=vpc, DataPlane=data_plane,
                    aws_profile=aws_profile)
    public_hosted_zone = PublicHostedZone(globalconfig=global_config,
                                          Application=application,
                                          aws_profile=aws_profile)

    return vpc, s3_vpc_endpoint, data_plane, tiler, application, \
        worker, public_hosted_zone


def build_stacks(mmw_config, aws_profile, **kwargs):
    """Trigger actual building of graphs"""
    vpc_graph, s3_vpc_endpoint_graph, data_plane_graph, tiler_graph, \
        application_graph, worker_graph, \
        public_hosted_zone_graph = build_graph(mmw_config, aws_profile,
                                               **kwargs)
    if kwargs['vpc']:
        if kwargs['print_json']:
            vpc_graph.set_up_stack()
            print(vpc_graph.to_json())
        else:
            vpc_graph.go()
        return

    if kwargs['data_plane']:
        if kwargs['print_json']:
            data_plane_graph.set_up_stack()
            print(data_plane_graph.to_json())
        else:
            data_plane_graph.go()
        return

    s3_vpc_endpoint_graph.go()

    if kwargs['stack_color'] is not None:
        tiler_graph.go()
        application_graph.go()
        worker_graph.go()

    if kwargs['activate_dns']:
        public_hosted_zone_graph.go()


def destroy_stacks(mmw_config, aws_profile, **kwargs):
    """Destroy stacks that are associated with stack_color"""
    region = mmw_config['Region']
    stack_color = kwargs['stack_color']

    cfn_conn = cfn.connect_to_region(region, profile_name=aws_profile)
    color_tag = ('StackColor', stack_color.capitalize())

    [stack.delete() for stack in cfn_conn.describe_stacks()
        if color_tag in stack.tags.items()]
