#!/usr/bin/env python
"""Commands for setting up the Model My Watershed stack on AWS"""

import argparse
import os

from cfn.stacks import build_stacks, get_config


current_file_dir = os.path.dirname(os.path.realpath(__file__))


def launch_stacks(mmw_config, aws_profile, **kwargs):
    build_stacks(mmw_config, aws_profile, **kwargs)


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

    # Launch MMW Stack
    mmw_stacks = subparsers.add_parser('launch-stacks',
                                       help='Launch MMW Stack',
                                       parents=[common_parser])
    mmw_stacks.set_defaults(func=launch_stacks)

    args = parser.parse_args()
    mmw_config = get_config(args.mmw_config_path, args.mmw_profile)
    args.func(mmw_config=mmw_config, **vars(args))

if __name__ == '__main__':
    main()
