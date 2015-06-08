from majorkirby import GlobalConfigNode

from vpc import VPC
from private_hosted_zone import PrivateHostedZone

import ConfigParser


def get_config(mmw_config_path, profile):
    """Parses a configuration file

    Arguments
    :param mmw_config_path: Path to the config file
    :param profile: Config profile to read
    """
    mmw_config = ConfigParser.ConfigParser()
    mmw_config.optionxform = str
    mmw_config.read(mmw_config_path)

    return {k: v.strip('"').strip("'") for k, v in mmw_config.items(profile)}


def build_graph(mmw_config, aws_profile, **kwargs):
    """
    Builds graphs for all of the MMW stacks
    Args:
      mmw_config (dict): dictionary representation of `default.yml`
      aws_profile (str): name of AWS profile to use for authentication
    """
    global_config = GlobalConfigNode(**mmw_config)
    vpc = VPC(globalconfig=global_config, aws_profile=aws_profile)
    private_hosted_zone = PrivateHostedZone(globalconfig=global_config,
                                            VPC=vpc, aws_profile=aws_profile)

    return vpc, private_hosted_zone


def build_stacks(mmw_config, aws_profile, **kwargs):
    """Trigger actual building of graphs"""
    vpc_graph, private_hosted_zone_graph = build_graph(mmw_config, aws_profile)
    private_hosted_zone_graph.go()
