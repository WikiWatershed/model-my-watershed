# Applying Migrations

The following instructions can be used to apply migrations to an AWS stack of this project.

## Prerequisites

- Access to the AWS Web Console
- SSH keys for the AWS instances

## Steps

### Add Private Key to SSH Authentication Agent

First, verify that the SSH Authentication Agent is running:

```bash
$ echo "$SSH_AUTH_SOCK"
```

On most UNIX based systems, the operating system automatically launches `ssh-agent` for you. On Windows, you may need to launch it manually with:

```bash
$ eval `ssh-agent`
```

If you want `ssh-agent` to start automatically, consider the [GitHub guide for Git Bash](https://help.github.com/articles/working-with-ssh-key-passphrases/#auto-launching-ssh-agent-on-msysgit).

Once `ssh-agent` is running, add your key:

```bash
$ ssh-add ~/.ssh/ec2.pem
Identity added: /home/username/.ssh/ec2.pem (/home/username/.ssh/ec2.pem)
```

After the key is added, confirm with:

```bash
$ ssh-add -L
```

### SSH into Bastion

```bash
$ ssh -A -l ubuntu monitoring.mmw.foo.com
```

The `-A`  enables forwarding of the authentication agent connection so that the `.pem` file doesn't have to by copied to the bastion.

### SSH into an Application Server

This is the step where you need access to the AWS Web Console to determine the private IP address of an application server. Once obtained:

```bash
$ ssh 10.0.1.191
```

### Run Migrations

After successfully connecting to an application server, run `setupdb.sh`:

```bash
$ /opt/model-my-watershed/scripts/aws/setupdb.sh
```

This script will:

- Ensure that PostGIS is installed on the configured database
- Attempt to apply any outstanding migrations
