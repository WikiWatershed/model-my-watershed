# Amazon Web Services Deployment

Deployment is driven by [Packer](https://www.packer.io), [Troposphere](https://github.com/cloudtools/troposphere), the [AWS Command Line Interface](http://aws.amazon.com/cli/) and [Boto](http://aws.amazon.com/cli/), the AWS SDK for Python. It requires some setup in your Amazon account, editing a configuration file, creating AMIs, and launching a stack.

## Dependencies

To install the Python deployment dependencies, use `pip`:

```bash
$ cd deployment
$ pip install -r requirements.txt
```

Next, install [Packer](https://packer.io/) using the steps detailed on Packer's [website](https://packer.io/downloads.html).

## Create Identity and Access Management (IAM) roles

TBD

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

### Generating AMIs

Before launching the Model My Watershed stack, AMIs for each service need to be generated:


```bash
$ ./mmw_stack.py create-ami --aws-profile mmw-stg --mmw-profile staging \
                            --machine-type mmw-{app,monitoring,tiler,worker}
```

### Launching Stacks

After successfully creating AMIs, you can launch a Model My Watershed stack with the `launch-stacks` subcommand. To view all options for the `launch-stacks` subcommand, you can use the `--help` option.

Using the parameters set in `default.yml`, you can launch a full stack with the following command:

```bash
$ ./mmw_stack.py launch-stacks --aws-profile mmw-stg --mmw-profile staging \
                               --mmw-config-path default.yml
```
