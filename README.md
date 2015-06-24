# model-my-watershed

## Local Development

A combination of Vagrant 1.6+ and Ansible 1.8+ is used to setup the development environment for this project. The project consists of the following virtual machines:

- `app`
- `services`
- `tiler`
- `worker`

The `app` virtual machine contains an instance of the Django application, `services` contains:

- PostgreSQL
- Pgweb
- Redis
- Logstash
- Kibana
- Graphite
- Statsite

`tiler` contains:

- Windshaft
- Mapnik

`worker` contains:

- Celery
- Flower

### Getting Started

Use the following command to bring up a local development environment:

```bash
$ MMW_ITSI_SECRET_KEY="***" vagrant up
```

The application will now be running at [http://localhost:8000](http://localhost:8000).

After pulling in new commits, you may need to run the following two commands:

```bash
$ ./scripts/manage.sh migrate
$ ./scripts/manage.sh reload_dev_data
$ ./scripts/bundle.sh
```

See debug messages from the web app server:

```bash
$ ./scripts/debugserver.sh
```

Watch the JavaScript and SASS files for changes:

```bash
$ ./scripts/bundle.sh --debug --watch
```

When creating new JavaScript or SASS files, you may need to stop and restart the bundle script.

If you add a JS dependency and want it to be included in the `vendor.js` bundle, you will need to update the `JS_DEPS` array in `bundle.sh` accordingly.

If changes were made to the one of the VM's configuration or requirements since the last time you provisioned, you'll need to reprovision.

```bash
$ vagrant provision <VM name>
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

Service                | Port | URL
---------------------- | -----| ------------------------------------------------
Django Web Application | 8000 | [http://localhost:8000](http://localhost:8000)
Graphite Dashboard     | 8080 | [http://localhost:8080](http://localhost:8080)
Kibana Dashboard       | 5601 | [http://localhost:5601](http://localhost:5601)
PostgreSQL             | 5432 | `psql -h localhost`
pgweb                  | 5433 | [http://localhost:5433](http://localhost:5433)
Redis                  | 6379 | `redis-cli -h localhost 6379`
Testem                 | 7357 | [http://localhost:7357](http://localhost:7357)
Tiler                  | 4000 | [http://localhost:4000](http://localhost:4000)
Flower                 | 5555 | [http://localhost:5555](http://localhost:5555)

### Caching

In order to speed up things up, you may want to consider leveraging the `vagrant-cachier` plugin. If installed, it is automatically used by Vagrant.

### Testing

Run all the tests:

```bash
$ ./scripts/test.sh
```

##### Python

To run all the tests on the Django app:

```bash
$ ./scripts/manage.sh test
```

Or just for a specific app:

```bash
$ ./scripts/manage.sh test appname
```

##### JavaScript

When creating new tests or debugging old tests, it may be easier to open the testem page, which polls for changes to the test bundle and updates the test state dynamically.

First, start the testem process.

```bash
$ ./scripts/testem.sh
```
Then view the test runner page at [http://localhost:7357](http://localhost:7357).

To enable livereload, [download the browser extension](http://livereload.com/extensions/)
and start the livereload server with the following command:

```bash
./scripts/npm.sh run livereload
```

#### Bundling static assets

The `bundle.sh` script runs browserify, node-sass, and othe pre-processing
tasks to generate static assets.

The vendor bundle is not created until you run this command with the
`--vendor` flag. This bundle will be very large if combined with `--debug`.

Test bundles are not created unless the `--tests` flag is used.

In general, you should be able to combine `--vendor`, `--tests`, `--debug`,
and `--watch` and have it behave as you would expect.

You can also minify bundles by using the `--minify` flag. This operation is
not fast, and also disables source maps.

The `--list` flag displays module dependencies and does not actually generate
any bundles. It doesn't make sense to combine this with `--watch`.
This flag is for troubleshooting purposes only.

    > bundle.sh -h
    bundle.sh [OPTION]...

    Bundle JS and CSS static assets.

     Options:
      --watch      Listen for file changes
      --debug      Generate source maps
      --minify     Minify bundles (**SLOW**); Disables source maps
      --tests      Generate test bundles
      --list       List browserify dependencies
      --vendor     Generate vendor bundle and copy assets
      -h, --help   Display this help text
