# model-my-watershed

## Local Development

A combination of Vagrant 1.6+ and Ansible 1.8+ is used to setup the development environment for this project. The project consists of the following virtual machines:

- `app`
- `services`

The `app` virtual machine contains an instance of the Django application and `services` contains:

- PostgreSQL
- Pgweb
- Redis
- Logstash
- Kibana
- Graphite
- Statsite

### Getting Started

Use the following command to bring up a local development environment:

```bash
$ vagrant up
```

The application will now be running at [http://localhost:8000](http://localhost:8000).

Watch the JavaScript and SASS files for changes:

```bash
$ ./scripts/bundle.sh --debug --watch
```

When creating new JavaScript or SASS files, you may need to stop and restart the bundle script.

If changes were made to the one of the VM's configuration or requirements since the last time you provisioned, you'll need to reprovision.

```bash
$ vagrant provision app # or services
```

After provisioning is complete, you can login to the application server and execute Django management commands:

```bash
$ vagrant ssh app
vagrant@app:~$ envdir /etc/mmw.d/env /opt/app/manage.py test
```

**Note**: If you get an error that resembles the following, try logging into the `app` virtual machine again for the group permissions changes to take effect:

```
envdir: fatal: unable to switch to directory /etc/mmw.d/env: access denied
```

### Ports

The Vagrant configuration maps the following host ports to services running in the virtual machines.

Service                | Port  | URL
---------------------- | ----- | ------------------------------------------------
Django Web Application | 8000  | [http://localhost:8000](http://localhost:8000)
Graphite Dashboard     | 8080  | [http://localhost:8080](http://localhost:8080)
Kibana Dashboard       | 5601 | [http://localhost:5601](http://localhost:5601)
PostgreSQL             | 5432 | `psql -h localhost`
pgweb                  | 5433 | [http://localhost:5433](http://localhost:5433)
Redis                  | 6379 | `redis-cli -h localhost 6379`

### Caching

In order to speed up things up, you may want to consider leveraging the `vagrant-cachier` plugin. If installed, it is automatically used by Vagrant.
