"""Helper functions to handle EC2 related operations with Boto3"""

import boto3
import logging


LOGGER = logging.getLogger('mmw')
LOGGER.addHandler(logging.StreamHandler())
LOGGER.setLevel(logging.INFO)

MACHINE_TYPE_MAPPING = {
    'mmw-app': 'Application',
    'mmw-tiler': 'Tiler',
    'mmw-worker': 'Worker',
}

# Snapshot IDs that should never be deleted (e.g., source RWD data)
PROTECTED_SNAPSHOTS = {
    'snap-0211cbbff8a81266f',  # Source RWD data
}


def _prune_ami(ec2_client, ami_id, snapshot_ids):
    """Actually deregister AMI and its associated snapshots"""
    LOGGER.info('Identified that [%s] is eligible to be pruned..', ami_id)

    ec2_client.deregister_image(ImageId=ami_id)
    
    for snapshot_id in snapshot_ids:
        ec2_client.delete_snapshot(SnapshotId=snapshot_id)
        LOGGER.info('Deleted snapshot [%s]', snapshot_id)

    LOGGER.info('Deregistered [%s] and %d snapshot(s)',
                ami_id, len(snapshot_ids))


def prune(mmw_config, machine_types, keep, aws_profile, dry_run=False):
    """Filter owned AMIs by machine type, environment, and count

    Args:
      mmw_config (dict): Dict of configuration settings
      machine_types (list): list of machine types to prune
      keep (int): number of images of this machine type to keep
      aws_profile (str): aws profile name to use for authentication
      dry_run (bool): if True, list AMIs without deleting them
    """
    stack_type = mmw_config['StackType']

    session = boto3.Session(profile_name=aws_profile)
    ec2_client = session.client('ec2')
    
    for machine_type in machine_types:
        response = ec2_client.describe_images(
            Owners=['self'],
            Filters=[
                {'Name': 'tag:Service',
                 'Values': [MACHINE_TYPE_MAPPING[machine_type]]},
                {'Name': 'tag:Environment', 'Values': [stack_type]}
            ]
        )
        images = response['Images']

        if len(images) > keep:
            # Sort by creation date
            sorted_images = sorted(images, key=lambda i: i['CreationDate'])
            images_to_prune = sorted_images[0:len(images) - keep]
            
            if dry_run:
                LOGGER.info('[DRY RUN] Would prune %d [%s] AMI(s):',
                           len(images_to_prune), machine_type)
            
            for image in images_to_prune:
                # Collect all snapshot IDs from all block device mappings
                snapshot_ids = []
                for bdm in image.get('BlockDeviceMappings', []):
                    if 'Ebs' in bdm and bdm['Ebs'].get('SnapshotId'):
                        snap_id = bdm['Ebs']['SnapshotId']
                        # Skip protected snapshots
                        if snap_id not in PROTECTED_SNAPSHOTS:
                            snapshot_ids.append(snap_id)

                if snapshot_ids:
                    if dry_run:
                        LOGGER.info('[DRY RUN] AMI: %s (created: %s) '
                                    'with %d snapshot(s): %s',
                                   image['ImageId'], image['CreationDate'],
                                   len(snapshot_ids), ', '.join(snapshot_ids))
                    else:
                        LOGGER.info(f'Skipping protected snapshot [{snap_id}]'
                                    f' for AMI [{image["ImageId"]}]')
                        _prune_ami(ec2_client, image['ImageId'], snapshot_ids)
        else:
            LOGGER.info('No [%s] AMIs are eligible for pruning', machine_type)
