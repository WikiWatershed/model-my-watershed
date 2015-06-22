{
    "variables": {
        "version": "",
        "branch": "",
        "aws_region": "",
        "aws_ubuntu_ami": "",
        "stack_type": ""
    },
    "builders": [
        {
            "name": "mmw-app",
            "type": "amazon-ebs",
            "region": "{{user `aws_region`}}",
            "source_ami": "{{user `aws_ubuntu_ami`}}",
            "instance_type": "m3.large",
            "ssh_username": "ubuntu",
            "ami_name": "mmw-app-{{timestamp}}-{{user `version`}}",
            "run_tags": {
                "PackerBuilder": "amazon-ebs"
            },
            "tags": {
                "Name": "mmw-app",
                "Version": "{{user `version`}}",
                "Branch": "{{user `branch`}}",
                "Created": "{{ isotime }}",
                "Service": "Application",
                "Environment": "{{user `stack_type`}}"
            },
            "subnet_id": "subnet-3781f46e",
            "associate_public_ip_address": true
        },
        {
            "name": "mmw-tiler",
            "type": "amazon-ebs",
            "region": "{{user `aws_region`}}",
            "source_ami": "{{user `aws_ubuntu_ami`}}",
            "instance_type": "m3.large",
            "ssh_username": "ubuntu",
            "ami_name": "mmw-tiler-{{timestamp}}-{{user `version`}}",
            "run_tags": {
                "PackerBuilder": "amazon-ebs"
            },
            "tags": {
                "Name": "mmw-tiler",
                "Version": "{{user `version`}}",
                "Branch": "{{user `branch`}}",
                "Created": "{{ isotime }}",
                "Service": "Tiler",
                "Environment": "{{user `stack_type`}}"
            },
            "subnet_id": "subnet-3781f46e",
            "associate_public_ip_address": true
        },
        {
            "name": "mmw-worker",
            "type": "amazon-ebs",
            "region": "{{user `aws_region`}}",
            "source_ami": "{{user `aws_ubuntu_ami`}}",
            "instance_type": "m3.large",
            "ssh_username": "ubuntu",
            "ami_name": "mmw-worker-{{timestamp}}-{{user `version`}}",
            "run_tags": {
                "PackerBuilder": "amazon-ebs"
            },
            "tags": {
                "Name": "mmw-worker",
                "Version": "{{user `version`}}",
                "Branch": "{{user `branch`}}",
                "Created": "{{ isotime }}",
                "Service": "Worker",
                "Environment": "{{user `stack_type`}}"
            },
            "subnet_id": "subnet-3781f46e",
            "associate_public_ip_address": true
        },
        {
            "name": "mmw-monitoring",
            "type": "amazon-ebs",
            "region": "{{user `aws_region`}}",
            "source_ami": "{{user `aws_ubuntu_ami`}}",
            "instance_type": "m3.large",
            "ssh_username": "ubuntu",
            "ami_name": "mmw-monitoring-{{timestamp}}-{{user `version`}}",
            "run_tags": {
                "PackerBuilder": "amazon-ebs"
            },
            "tags": {
                "Name": "mmw-monitoring",
                "Version": "{{user `version`}}",
                "Branch": "{{user `branch`}}",
                "Created": "{{ isotime }}",
                "Service": "Monitoring",
                "Environment": "{{user `stack_type`}}"
            },
            "subnet_id": "subnet-3781f46e",
            "associate_public_ip_address": true
        }
    ],
    "provisioners": [
        {
            "type": "shell",
            "inline": [
                "sleep 5",
                "sudo apt-get update -qq",
                "sudo apt-get install python-pip python-dev -y",
                "sudo pip install ansible==1.9.0.1"
            ]
        },
        {
            "type": "ansible-local",
            "playbook_file": "ansible/app-servers.yml",
            "playbook_dir": "ansible",
            "inventory_file": "ansible/inventory/packer-app-server",
            "extra_arguments": [
                "--extra-vars 'app_deploy_branch={{user `version`}}'"
            ],
            "only": [
                "mmw-app"
            ]
        },
        {
            "type": "ansible-local",
            "playbook_file": "ansible/tile-servers.yml",
            "playbook_dir": "ansible",
            "inventory_file": "ansible/inventory/packer-tile-server",
            "extra_arguments": [
                "--extra-vars 'tiler_deploy_branch={{user `version`}}'"
            ],
            "only": [
                "mmw-tiler"
            ]
        },
        {
            "type": "ansible-local",
            "playbook_file": "ansible/workers.yml",
            "playbook_dir": "ansible",
            "inventory_file": "ansible/inventory/packer-worker-server",
            "extra_arguments": [
                "--extra-vars 'app_deploy_branch={{user `version`}}'"
            ],
            "only": [
                "mmw-worker"
            ]
        },
        {
            "type": "ansible-local",
            "playbook_file": "ansible/monitoring-servers.yml",
            "playbook_dir": "ansible",
            "inventory_file": "ansible/inventory/packer-monitoring-server",
            "only": [
                "mmw-monitoring"
            ]
        }
    ]
}
