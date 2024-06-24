# ansible-nginx

An Ansible role to install Nginx.

## Role Variables

- `nginx_version` - Nginx version (default: `stable`, valid options are: `stable` or `development`)
- `nginx_delete_default_site` - Whether or not to delete the default Nginx site (default: `False`)

## Example Playbook

See the [examples](./examples/) directory.
