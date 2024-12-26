"""Helper functions to handle AMI creation with packer"""

import os
from os.path import dirname
import shutil
import subprocess

import logging

from cfn.utils.cfn import get_recent_ami
from cfn.utils.constants import CANONICAL_ACCOUNT_ID

LOGGER = logging.getLogger(__file__)
LOGGER.addHandler(logging.StreamHandler())
LOGGER.setLevel(logging.INFO)


def get_recent_ubuntu_ami(region, aws_profile):
    """Gets AMI ID for current release in region"""
    filters = {
        'name': 'ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*',
        'architecture': 'x86_64',
        'root-device-type': 'ebs',
        'virtualization-type': 'hvm',
    }

    return get_recent_ami(aws_profile, region=region,
                          filters=filters, owner=CANONICAL_ACCOUNT_ID)


def get_project_root():
    return dirname(dirname(dirname(os.path.realpath(__file__))))


def update_ansible_roles():
    """Function that executes ansible-galaxy to ensure all roles are
       up-to-date before Packer runs."""
    ansible_dir = os.path.join(get_project_root(), 'deployment', 'ansible')
    ansible_roles_path = os.path.join(ansible_dir, 'roles')
    ansible_command = ['ansible-galaxy',
                       'install',
                       '-f',
                       '-r', 'roles.yml',
                       '-p', ansible_roles_path]
    subprocess.check_call(ansible_command, cwd=ansible_dir)

    # Remove `examples` subdirectory from all Azavea roles
    for role_path in os.listdir(ansible_roles_path):
        examples_path = os.path.join(ansible_roles_path, role_path, 'examples')

        if role_path.startswith('azavea') and os.path.isdir(examples_path):
            LOGGER.debug('Removing %s', examples_path)
            shutil.rmtree(examples_path)


def get_git_sha():
    """Function that executes Git to determine the current SHA"""
    git_command = ['git',
                   'rev-parse',
                   'HEAD']

    return subprocess.check_output(
        git_command,
        universal_newlines=True).rstrip()


def get_git_branch():
    """Function that executes Git to determine the current branch"""
    git_command = ['git',
                   'rev-parse',
                   '--abbrev-ref',
                   'HEAD']

    return subprocess.check_output(
        git_command,
        universal_newlines=True).rstrip()


def get_git_desc():
    """Function that executes Git to determine the description"""
    git_command = ['git',
                   'describe',
                   '--tags',
                   '--always',
                   '--dirty',
                   '--abbrev=40']

    return subprocess.check_output(
        git_command,
        universal_newlines=True).rstrip()


def run_packer(mmw_config, machine_types, aws_profile):
    """Function to run packer

    Args:
      mmw_config (dict): Dict of configuration settings
      machine_types (list): list of machine types to build
      aws_profile (str): aws profile name to use for authentication
    """

    region = mmw_config['Region']
    stack_type = mmw_config['StackType']

    # Get most recent Ubuntu release AMI
    aws_ubuntu_ami = get_recent_ubuntu_ami(region, aws_profile)

    update_ansible_roles()

    env = os.environ.copy()
    env['AWS_PROFILE'] = aws_profile

    packer_template_path = os.path.join(get_project_root(),
                                        'deployment', 'packer', 'mmw.json')

    LOGGER.info('Creating %s AMI in %s region', machine_types, region)

    packer_command = [
        'packer', 'build',
        '-var', 'version={}'.format(env.get('GIT_COMMIT',
                                            get_git_sha())),
        '-var', 'branch={}'.format(env.get('GIT_BRANCH',
                                           get_git_branch())),
        '-var', 'description={}'.format(get_git_desc()),
        '-var', 'aws_region={}'.format(region),
        '-var', 'aws_ubuntu_ami={}'.format(aws_ubuntu_ami),
        '-var', 'stack_type={}'.format(stack_type)]

    if machine_types is not None:
        packer_command.extend(['-only', ','.join(machine_types)])

    packer_command.append(packer_template_path)

    LOGGER.debug('Running Packer Command: %s', ' '.join(packer_command))

    subprocess.check_call(packer_command, env=env)
