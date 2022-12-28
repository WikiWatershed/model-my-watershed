# model-my-watershed

## Local Development

A combination of Vagrant 2.2+ and Ansible 2.8 is used to setup the development environment for this project. The project consists of the following virtual machines:

- `app`
- `services`
- `tiler`
- `worker`

The `app` virtual machine contains an instance of the Django application, `services` contains:

- PostgreSQL
- Redis

`tiler` contains:

- Windshaft
- Mapnik

`worker` contains:

- Celery
- Docker

### Getting Started

First, ensure that you have a set of Amazon Web Services (AWS) credentials with access to Azavea's pre-processed NLCD data set. This setup generally needs to happen on the virtual machine host using the [AWS CLI](https://aws.amazon.com/cli/):

```bash
$ aws configure --profile mmw-stg
```

You will also need to set the MMW Datahub AWS credential as your default. These are stored in lastpass under the name `MMW Azavea DataHub AWS`. Ensure that the AWS credentials file has universal read permissions.

Ensure you have the [vagrant-disksize](https://github.com/sprotheroe/vagrant-disksize) plugin installed:

```bash
$ vagrant plugin install vagrant-disksize
```

Starting with Virtualbox 6.1.28, [host-only networks](https://www.virtualbox.org/manual/ch06.html#network_hostonly) are restricted to `192.168.56.0/21` by default. 

We will need to do the following to override this restriction:

```bash
sudo mkdir /etc/vbox

echo "
* 192.168.56.0/21
* 33.33.0.0/16" | sudo tee /etc/vbox/networks.conf
```

Next, use the following command to bring up a local development environment, ensuring you have the most recent version of the base box:

```bash
$ vagrant box update
$ vagrant up
```

The application will now be running at [http://localhost:8000](http://localhost:8000).

After significant changes, you may need to run the following two commands to apply database migrations and rebuild JavaScript assets:

```bash
$ ./scripts/manage.sh migrate
$ ./scripts/bundle.sh
```

To load or reload boundary data, from an `app` server, run (`scripts` is not mounted by default to the VM, you may need to copy the file over):

```bash
$ vagrant upload ./scripts/ app
$ vagrant ssh app
$ ./scripts/aws/setupdb.sh -b
```

The same script can be used to load the stream network data:

```bash
$ ./scripts/aws/setupdb.sh -s
```

and all the other data:

```bash
$ ./scripts/aws/setupdb.sh -d
$ ./scripts/aws/setupdb.sh -m
$ ./scripts/aws/setupdb.sh -p
$ ./scripts/aws/setupdb.sh -c
$ ./scripts/aws/setupdb.sh -q
```

Note that if you receive out of memory errors while loading the data, you may want to increase the RAM on your `services` VM (1512 MB may be all that is necessary).

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

After provisioning is complete, you can execute Django management commands with:

```bash
$ ./scripts/manage.sh test
```

**Note**: If you get an error that resembles the following, try logging into the `app` virtual machine again for the group permissions changes to take effect:

```
envdir: fatal: unable to switch to directory /etc/mmw.d/env: access denied
```

### Ports

The Vagrant configuration maps the following host ports to services running in the virtual machines.

| Service                | Port | URL                                            |
| ---------------------- | ---- | ---------------------------------------------- |
| Django Web Application | 8000 | [http://localhost:8000](http://localhost:8000) |
| PostgreSQL             | 5432 | `psql -h localhost`                            |
| Redis                  | 6379 | `redis-cli -h localhost 6379`                  |
| Testem                 | 7357 | [http://localhost:7357](http://localhost:7357) |
| Tiler                  | 4000 | [http://localhost:4000](http://localhost:4000) |

### Caching

To speed up geoprocessing, those requests are cached in Redis. To disable this caching for development purposes, set the value of `MMW_GEOPROCESSING_CACHE` to `0`:

```bash
$ vagrant ssh worker -c 'echo "0" | sudo tee /etc/mmw.d/env/MMW_GEOPROCESSING_CACHE'
$ vagrant ssh worker -c 'sudo service celeryd restart'
```

To enable the geoprocessing cache simply set it to `1` and restart the `celeryd` service.

In some cases, it may be necessary to remove all cached values. This can be done with:

```bash
$ vagrant ssh services -c 'redis-cli -n 1 --raw KEYS ":1:geop_*" | xargs redis-cli -n 1 DEL'
```

### Test Mode

In order to run the app in test mode, which simulates the production static asset bundle, reprovision with `VAGRANT_ENV=TEST vagrant provision`.

### Testing

Run all the tests:

```bash
$ ./scripts/test.sh
```

##### Python

To check for Python lint:

```bash
$ ./scripts/check.sh
```

To run all the tests on the Django app:

```bash
$ ./scripts/manage.sh test
```

Or just for a specific app:

```bash
$ ./scripts/manage.sh test apps.app_name.tests
```

More info [here](https://docs.djangoproject.com/en/1.8/topics/testing/).

Run MapShed tests, which require MapShed tables installed in the local database
(using `setupdb.sh`):

```console
$ ./scripts/manage.sh test_mapshed
```

##### JavaScript

To check for JavaScript lint:

```bash
$ ./scripts/yarn.sh run lint
```

When creating new tests or debugging old tests, it may be easier to open the testem page, which polls for changes to the test bundle and updates the test state dynamically.

First, start the testem process.

```bash
$ ./scripts/testem.sh
```
Then view the test runner page at [http://localhost:7357](http://localhost:7357).

To enable livereload, [download the browser extension](http://livereload.com/extensions/)
and start the livereload server with the following command:

```bash
./scripts/yarn.sh run livereload
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

#### Adding JS dependencies

To add a new JS dependency, use

```console
$ ./scripts/yarn.sh add --exact <dependency>
```

this will download the dependency to `node_modules`, add to the `package.json`, and to `yarn.lock`.
Furthermore, it will be pinned to the current version.
Then, update the `JS_DEPS` array in `bundle.sh`.
Rebuild the vendor bundle using `./scripts/bundle.sh --vendor`.
`yarn` commands can be run using `./scripts/yarn.sh`.
