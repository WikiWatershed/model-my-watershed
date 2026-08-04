---
name: Release
about: Steps to make a new release for Model My Watershed
title: Release 1.X.Y
assignees: ""
---

## Contents

This includes the following fixes:

- (List of PRs)

## Steps

- [ ] Start the release `git flow release start 1.X.Y`
- [ ] Disable the [develop job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-develop/)
- [ ] Enable the [release job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-release/)
- [ ] Publish the release `git flow release publish 1.X.Y`
- [ ] Wait for the [release job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-release/), the [app and worker packer job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-packer-app-and-worker/), the [tiler packer job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-packer-tiler/), and the [staging deployment job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-staging-deployment/) to finish 
- [ ] Test the staging site https://staging.modelmywatershed.org
- [ ] [Promote the 1.X.Y AMIs to Production](https://github.com/WikiWatershed/model-my-watershed/blob/develop/deployment/RELEASES.md#ami-promotion)
- [ ] Launch the dark stack (using the color other than the current one)
    ```
    python3 mmw_stack.py launch-stacks --aws-profile mmw-prd \
                                       --mmw-config-path default.yml \
                                       --mmw-profile production \
                                       --stack-color (green|blue)
    ```
- [ ] Test the dark stack
- [ ] Take a database snapshot
    - [ ] No snapshot was taken because this release does not change the database
- [ ] Cutover DNS (using the same color as in the last step)
    ```
    python3 mmw_stack.py launch-stacks --aws-profile mmw-prd \
                                       --mmw-config-path default.yml \
                                       --mmw-profile production \
                                       --stack-color (green|blue) \
                                       --activate-dns
    ```
- [ ] Test the production site https://modelmywatershed.org
- [ ] Disable the [release job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-develop/)
- [ ] Enable the [develop job](http://civicci01.internal.azavea.com/view/mmw/job/model-my-watershed-develop/)
- [ ] Finish the release `git flow release finish -p 1.X.Y`
- [ ] Remove the old stack (using the color of the old stack)
    ```
    python3 mmw_stack.py remove-stacks --aws-profile mmw-prd \
                                       --mmw-config-path default.yml \
                                       --mmw-profile production \
                                       --stack-color (blue|green)
    ```
- [ ] Review old production AMIs for pruning
    ```
    python3 mmw_stack.py prune-ami --aws-profile mmw-stg \
                                   --mmw-config-path default.yml \
                                   --mmw-profile production \
                                   --machine-type mmw-app mmw-tiler mmw-worker \
                                   --keep 5 \
                                   --dry-run
    ```
- [ ] Run the above without `--dry-run` to actually delete the AMIs
- [ ] Add release: https://github.com/WikiWatershed/model-my-watershed/releases/tag/1.X.Y
