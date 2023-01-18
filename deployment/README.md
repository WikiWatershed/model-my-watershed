# Amazon Web Services Deployment

Deployment is driven by [Packer](https://www.packer.io), [Troposphere](https://github.com/cloudtools/troposphere), the [AWS Command Line Interface](http://aws.amazon.com/cli/) and [Boto](http://aws.amazon.com/cli/), the AWS SDK for Python. It requires some setup in your Amazon account, editing a configuration file, creating AMIs, and launching a stack.

## Dependencies

To install the Python deployment dependencies, use `pip`:

```bash
$ cd deployment
$ pip install "setuptools<58"
$ pip install -r requirements.txt
```

Next, install [Packer](https://packer.io/) using the steps detailed on Packer's [website](https://packer.io/downloads.html).

## Create Identity and Access Management (IAM) roles

See [Create an IAM Instance Profile for Your Amazon EC2 Instances](http://docs.aws.amazon.com/codedeploy/latest/userguide/how-to-create-iam-instance-profile.html).

## Configure an AWS Profile using the AWS CLI

Using the AWS CLI, create an AWS profile:

```bash
$ aws configure --profile mmw-stg
```

You will be prompted to enter your AWS credentials, along with a default region. These credentials will be used to authenticate calls to the AWS API when using Boto, Packer, and the AWS CLI.

## Edit the configuration file

A configuration file is required to launch the stack. An example file (`default.yml.example`) is available in the current directory.

## Launch and manage stacks

Stack launching is managed with `mmw_stack.py`. This command provides an interface for automatically generating AMIs and launching Model My Watershed stacks.

### VPC and Data Plane Stacks

The VPC and Data Plane stacks are decoupled from the Model My Watershed stack.

To launch the VPC stack:

```bash
$ ./mmw_stack.py launch-stacks --aws-profile mmw-stg --mmw-profile staging \
                               --mmw-config-path default.yml --vpc
```

To launch the Data Plane stack:

```bash
$ ./mmw_stack.py launch-stacks --aws-profile mmw-stg --mmw-profile staging \
                               --mmw-config-path default.yml --data-plane
```

It is reccomended to use the `--print-json` flag to dump the CloudFormation JSON, and to apply changes to these stacks via a change set in the AWS Console:

```bash
$ ./mmw_stack.py launch-stacks --aws-profile mmw-stg --mmw-profile staging \
                               --mmw-config-path default.yml --data-plane --print-json > data-plane.json
```

### Generating AMIs

Before launching the Model My Watershed stack, AMIs for each service need to be generated:

```bash
$ ./mmw_stack.py create-ami --aws-profile mmw-stg --mmw-profile staging \
                            --machine-type mmw-{app,tiler,worker}
```

### Pruning AMIs

After creating several AMIs, older ones become stale and are no longer needed. To prune them use:

```bash
$ ./mmw_stack.py prune-ami --aws-profile mmw-stg --mmw-profile staging \
                           --keep 5 --machine-type mmw-{app,tiler,worker}
```

### Launching Stacks

After successfully creating AMIs, you can launch a Model My Watershed stack with the `launch-stacks` subcommand. To view all options for the `launch-stacks` subcommand, you can use the `--help` option.

Using the parameters set in `default.yml`, you can launch a full stack with the following command:

```bash
$ ./mmw_stack.py launch-stacks --aws-profile mmw-stg --mmw-profile staging \
                               --mmw-config-path default.yml
```
