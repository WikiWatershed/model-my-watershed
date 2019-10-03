# Integrating a New Client App for PA DEP

## Context

The Pennsylvania Department of Environmental Protection (PA DEP) has been using desktop MapShed and MMW for their workflows for some time.
This workflow involves running the MapShed model in MMW for a HUC-12,
and also for an area of interest within the HUC-12,
and copying the output tables into specific parts of the [MMW BMP Spreadsheet Tool][bmp-tool].
This is cumbersome and error prone,
and would be much better be done in an automated fashion,
where when users download the spreadsheet it is pre-populated with the right values in the right places.

Since this requires having two effective areas of interest at once,
this workflow does not fit neatly in MMW,
which always expects a single area of interest.
Rather than change MMW to accomodate this unusual and rare use case,
it would be much simpler to create a new client app that is focused on this workflow.
It will use the MMW API for all calculations.

Given that we'll have a new client app,
this is an opportunity to introduce a more modern tech stack on the front-end.
This was recently done for [a similar project][beekeepers],
where a new front-end stack was added within a Django app to sandbox it from the rest of the project.
This document aims to discuss the pros and cons of different arrangements for the new client app,
and pick one that satisfies all project constraints.

The one major directive from the clients is that,
from a user's perspective,
the site should be deeply integrated with MMW.
That is to say,
it should use the same colors and branding,
and not feel like its own project.

From the development perspective,
we should aim for using the latest front-end stacks,
clean communication with the back-end API,
and having a fast deployment pipeline.

### Considerations

To find the right balance of coupling between the two apps,
we must consider how the code is stored and written (same vs different repositories),
how the apps are deployed (paired or independently),
and how the apps are accessed by users (via subdomain or subdirectory).
These considerations are not entirely independent of each other,
e.g. paired deployments are easier to do with the same repository.

We must also consider non-technical factors,
such as the explicit directive to have a consistent user experience between the apps.
This requirement rules out subdomain access,
which would break the immersion of using the same app.

#### Repository: Same vs Different

Advantages of having the **same repository**:

  * Familiarity, as it was done in the [Beekeepers][beekeepers] project
  * All issues can be in one repo, simplifying project management
  * Tasks that affect both front-end and back-end can be tracked in one commit or PR
  * Simpler deployment, as front-end and back-end will always be in sync
  * Styles can be easily reused between the two apps
  * Easier to simulate production environments in development,
    as we only need to start a single development environment.

Advantages of having **different repositories**:

  * Cleaner logical separation in the codebase
  * Fewer cohabiting developer entry points, i.e. `package.json`, or multiple `node_modules`
  * Does not require changing the `node` or `npm` version in MMW
  * Does not require adding a Docker environment in MMW for building the front-end
    - In case we do not change the `node` version in MMW,
      we can isolate the new build toolchain in a Docker environment
  * Faster deployment, as the client app can be deployed independently of the main app

#### Deployment: Paired vs Independent

Advantages of **paired deployment**:

  * Front-end and back-end will always be in sync
  * Does not require extra configuration of AWS
  * Does not need extra steps during deployment
  * Easier to write end-to-end tests

Advantages of **independent deployment**:

  * Front-end can be iterated much faster, without the heavy deployment cycle of MMW

### Architecture Options

#### Option A: Same Repository, Paired Deployment

Similar to Beekeepers,
we will create a Django app to house all files for the new client app.
We will evaluate if the `node` version in the App VM can be upgraded,
and if not we will use add a Docker container for building the front-end.
Django will be configured to handle routing,
which will render a different home page for the new routes.
Deployments will not be affected at all and will proceed as usual.
Some basic styles and colors will be shared between the two apps:
they will have independent stylesheets, but some common resources,
such as colors,
may be shared between the two.

#### Option B: Different Repositories, Independent Deployments

The new app gets its own repository,
which better isolates the new front-end code from legacy code.
During development, the MMW VM would have to be running in addition to the client app.
The app will be deployed to a static host like S3 or Netlify.
nginx will be configured to proxy the static host at the subdirectory route.
Deployments of cosmetic changes to the new client app can be made independently,
but functional changes to how the API is consumed will have to be coordinated with MMW.
Project management will be split across the two repos,
with front-end tasks listed on the new repo and back-end tasks listed on MMW.

## Decision

We will go with Option A above,
keeping one repository for the codebase and doing paired deployments.
This has the advantages of being a familiar approach,
keeping the back- and front-ends in sync,
and not needing any changes to the deployment pipeline.

## Consequences

Since the more modern stack of the new app will require a more modern version of `node`,
we will have to investigate if the one in the App VM can be safely upgraded without affecting the current `bundle` pipeline,
or if it will require isolation within Docker as done for Beekeepers.

As the new app will be deeply integrated with MMW,
any changes,
no matter how small,
will require a full MMW deployment.

[bmp-tool]: https://github.com/WikiWatershed/MMW-BMP-spreadsheet-tool
[beekeepers]: https://github.com/project-icp/bee-pollinator-app/tree/develop/src/icp/apps/beekeepers
