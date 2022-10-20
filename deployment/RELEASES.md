# Releases

## Release Branch

First, create a release branch for the version about to be released:

```bash
$ git flow release start X.Y.Z
$ git flow release publish X.Y.Z
```

Once published, disable the `develop` job in Jenkins, and enable the `release` job:

- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-develop/
- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-release/

Next, trigger a build using the "Build Now" link.

## Release AMIs

Once the `release` job completes successfully, it should kick off two additional jobs:

- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-packer-app-and-worker/
- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-packer-tiler/

Once those two jobs complete successfully, a `staging-deployment` job will be kicked off:

- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-staging-deployment/

As that is happening, login to the Model my Watershed staging AWS account and locate the newly created AMIs within the AWS console under:

> `EC2 > Images > AMIs`

If you cannot see columns for `Branch`, `Environment`, and `Service`, use the gear icon above the AMI listing to enable them.

## Release Testing

After the `staging-deployment` job completes, `staging.modelmywatershed.org` and `staging.portal.bigcz.org` should reflect the current release. Be sure to run any outstanding database migrations or data imports.

## AMI Promotion

Select one AMI for each `Service` built using the `release/X.Y.Z` branch. Once selected, use the `Permissions` tab to `Edit` the AMI and allow account ID `146471631080` execute privileges. In addition, use the `Tags` tab to `Add/Edit Tags` for the `Environment` key. Ensure that its value is changed from `Staging` to `Production`.

To confirm, you can login to the Model my Watershed "production" account and see if the AMIs show up under the `Private images` filter.

## Dark Stack Launch

Ensure that the `production` section of `default.yml` reflects the desired state of your new stack (instance types, instance counts, etc.). Then, launch a new stack using the opposite color that is currently deployed:

```bash
python3 mmw_stack.py launch-stacks --aws-profile mmw-prd \
                                   --mmw-config-path default.yml \
                                   --mmw-profile production \
                                   --stack-color blue
```

This will launch a new `Tiler`, `Application`, and `Worker` stack namespaced by `stack-color`.

## Database Snapshot

Before applying any outstanding migrations, take a snapshot of the RDS database using the RDS console. Ensure that it is labeled with something that represents the current release.

After the snapshot creation process is complete, execute any outstanding migrations using the instructions in `MIGRATIONS.md`.

## Test via Elastic Load Balancer (ELB) endpoint; Cut over DNS

Using the newly created ELB endpoint, try to interact with the dark application stack:

> `EC2 > Load Balancing > Load Balancers`

If everything looks good, use the following command to cut over DNS to the new ELB endpoint:

```bash
python3 mmw_stack.py launch-stacks --aws-profile mmw-prd \
                                   --mmw-config-path default.yml \
                                   --mmw-profile production \
                                   --stack-color blue \
                                   --activate-dns
```

Within 60 seconds, `modelmywatershed.org` and `portal.bigcz.org` should reflect the current release.

## Repository & Jenkins Cleanup

Disable the `release` job in Jenkins, and enable the `develop` job:

- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-develop/
- http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-release/

Execute the following commands to reconcile the release branch:

```bash
$ git flow release finish X.Y.Z
$ git push origin develop
$ git checkout master && git push origin master
$ git push --tags
```

## Remove Old Stack

Lastly, use the following command to remove the now dark stack:

```bash
python3 mmw_stack.py remove-stacks --aws-profile mmw-prd \
                                   --mmw-config-path default.yml \
                                   --mmw-profile production \
                                   --stack-color green
```
