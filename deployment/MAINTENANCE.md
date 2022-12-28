# Maintaining Running Instances

This document collects some common issues, workarounds for them, and plans for potential fixes in the future.

## Prerequisites

- Access to the AWS Web Console

## Known Issues

### SIGKILL search matches

To solve the issue of Celery workers dying in production ([#1516](https://github.com/WikiWatershed/model-my-watershed/issues/1516), [#2981](https://github.com/WikiWatershed/model-my-watershed/issues/2981), [#3084](https://github.com/WikiWatershed/model-my-watershed/issues/3084)), we instituted two workarounds:

1. Restart Celery every night [#3085](https://github.com/WikiWatershed/model-my-watershed/issues/3085), [#3286](https://github.com/WikiWatershed/model-my-watershed/issues/3286)
2. Add Papertrail alert for SIGKILL [#3278](https://github.com/WikiWatershed/model-my-watershed/issues/3278)

The second one incidentally also catches SIGKILLs of `snapd.service`. We don't actively use `snapd` in this project, but this generally indicates that the instance is out of hard drive space. Through a combination of higher disk usage in fresh VMs, and more verbose logs, the Worker VMs run out of space quicker.

A longer term fix would involve a combination of reducing the base disk use, reducing the amount of logging done in those VMs, and rotating the logs so that they don't fill the VM up. Until we have the funding for such an investigation, we employ the following workaround.

#### Workaround

1. Login to the production account using `mmw-prd` credentials in Azavea's BitWarden
2. Navigate to EC2 → Instances
3. Filter the Instances by `Instance state = running` and `Name = Worker`
4. Select all of them
5. Go to Instance state → Terminate
    
    https://user-images.githubusercontent.com/1430060/204665413-370025b1-091e-4351-bc3d-04d5595e575b.mp4

6. The load balancer will spin up new instances to replace these
7. Once they are up, go to https://modelmywatershed.org/ and **draw** a shape
    - Drawing a shape is important so that we don't use cached values and bypass Celery
8. Ensure that the analyses for the drawn shape complete successfully
