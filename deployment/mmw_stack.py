#!/usr/bin/env python
"""Commands for setting up the Model My Watershed stack on AWS"""

import argparse
import os

from cfn.stacks import build_stacks, destroy_stacks, get_config
from ec2.amis import prune
from packer.driver import run_packer


current_file_dir = os.path.dirname(os.path.realpath(__file__))


def launch_stacks(mmw_config, aws_profile, **kwargs):
    build_stacks(mmw_config, aws_profile, **kwargs)


def remove_stacks(mmw_config, aws_profile, **kwargs):
    destroy_stacks(mmw_config, aws_profile, **kwargs)


def create_ami(mmw_config, aws_profile, machine_type, **kwargs):
    run_packer(mmw_config, machine_type, aws_profile=aws_profile)


def prune_amis(mmw_config, aws_profile, machine_type, keep, **kwargs):
    prune(mmw_config, machine_type, keep, aws_profile=aws_profile)


def main():
    """Parse args and run desired commands"""
    common_parser = argparse.ArgumentParser(add_help=False)
    common_parser.add_argument('--aws-profile', default='default',
                               help='AWS profile to use for launching stack '
                                    'and other resources')
    common_parser.add_argument('--mmw-config-path',
                               default=os.path.join(current_file_dir,
                                                    'default.yml'),
                               help='Path to MMW stack config')
    common_parser.add_argument('--mmw-profile', default='default',
                               help='MMW stack profile to use for launching '
                                    'stacks')

    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(title='Model My Watershed Stack '
                                             'Commands')

    mmw_stacks = subparsers.add_parser('launch-stacks',
                                       help='Launch MMW Stack',
                                       parents=[common_parser])
    mmw_stacks.add_argument('--stack-color', type=str,
                            choices=['green', 'blue'],
                            default=None,
                            help='One of "green", "blue"')
    mmw_stacks.add_argument('--activate-dns', action='store_true',
                            default=False,
                            help='Activate DNS for current stack color')
    mmw_stacks.set_defaults(func=launch_stacks)

    mmw_remove_stacks = subparsers.add_parser('remove-stacks',
                                              help='Remove MMW Stack',
                                              parents=[common_parser])
    mmw_remove_stacks.add_argument('--stack-color', type=str,
                                   choices=['green', 'blue'],
                                   required=True,
                                   help='One of "green", "blue"')
    mmw_remove_stacks.set_defaults(func=remove_stacks)

    mmw_ami = subparsers.add_parser('create-ami', help='Create AMI for Model '
                                                       'My Watershed Stack',
                                    parents=[common_parser])
    mmw_ami.add_argument('--machine-type', type=str,
                         nargs=argparse.ONE_OR_MORE,
                         choices=['mmw-app', 'mmw-tiler', 'mmw-worker'],
                         default=None, help='Machine type to create AMI')
    mmw_ami.set_defaults(func=create_ami)

    mmw_prune_ami = subparsers.add_parser('prune-ami',
                                          help='Prune stale Model My '
                                               'Watershed AMIs',
                                          parents=[common_parser])
    mmw_prune_ami.add_argument('--machine-type', type=str, required=True,
                               nargs=argparse.ONE_OR_MORE,
                               choices=['mmw-app', 'mmw-tiler', 'mmw-worker'],
                               help='AMI type to prune')
    mmw_prune_ami.add_argument('--keep', type=int, default=10,
                               help='Number of AMIs to keep')
    mmw_prune_ami.set_defaults(func=prune_amis)

    args = parser.parse_args()
    mmw_config = get_config(args.mmw_config_path, args.mmw_profile)
    args.func(mmw_config=mmw_config, **vars(args))

if __name__ == '__main__':
    main()
