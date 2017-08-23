## 004 - Expose Geoprocessing API

### Context
The MMW/BigCZ platform performs a number of geospatial processing tasks which can be initiated by submitting tasks to an HTTP endpoint.  The web application provides the tools and workflow for assembling and submitting the input, monitoring execution progress, and collecting and visualizing the results of these jobs.  The platform provides value by assembling the required national scale data and the infrastructure necessary to perform the processing. In an effort to extend this capability to alternate workflows that don't involve the web platform, the client wants to formalize an externally consumable HTTP API.

MMW/BigCZ already includes and makes limited use of the Django REST Framework (DRF), which supports convenience methods around creating HTTP APIs.

#### API Objectives
* Support execution of all current and future "Analyze" sub tasks (Land Use, Soil, etc)
* Support execution of Rapid Watershed Delineation
* Model execution functionality will not be exposed
* Available only for registered users
* Usage will be recorded
* Long term goal would be to charge for access

#### Considerations
* Geoprocessing routines are asynchronous, requiring submission and polling to determine when results are available.
* Geoprocessing is a resource intensive operation.
* Geoprocessing endpoints must remain open for anonymous users using the web platform.
* Azavea maintains the only client of the current API, therefore we have had the freedom to make changes at will.  When an API is released, we'll have to treat releases of the platform carefully and possibly retain backwards compatibility.

Based on the above, an API solution should adhere to the following implementation details:
##### 1. Have a mechanism for authenticating a user
Two options seem to be potentially appropriate: an API key associated with a user account, or an expiring token generated based on client supplied credentials.  API keys are easier to use, but inherently less secure since they can be reused by multiple parties and have to be included in the request. They can be revoked, allowing a failsafe against long term unauthorized use. Expiring tokens require the user to securely manage credentials, which can be difficult, especially when the desire is to use the API from frontend browser code.
##### 2. Have at least rudimentary rate limiting capabilities
Unrestricted job submission, even if used modestly, could have a considerable negative impact on the web platform performance.  If users anticipate using the API for batch processing, they should be restricted in how often they can submit.
##### 3. Not result in duplicated code
The web platform needs to have access to unauthenticated endpoints.  This could theoretically be accomplished through domain white listing within the DRF endpoints or the existing endpoints.  Regardless, the implementation should be generalized in one specific place that the API and platform utilize.
##### 4. Enforce size and shape validation
The front end code which submits analysis jobs is responsible for the majority of shape validation.  This will need to be included in the API, as well as for additional potential conflicts like coordinate systems and being contained within the CONUS.  This may require some restriction on upload payload size, which is currently handled through nginx.

#### Options
##### Reuse existing endpoints
Our existing endpoints `/start/analyze/*` and `/start/rwd` have the exact functionality that is needed, but are limited by specific implementation details:
* Do not require authentication
* Validation is largely handled by front end submission routine
* Paths and naming were not selected in the context of a public API
* CORS is not enabled

##### Create new DRF based API endpoints
DRF is already used in the application and has support for authentication systems such as [Token Auth](http://www.django-rest-framework.org/api-guide/authentication/#tokenauthentication), as well as some helper views for manging creation tokens.  It also supports a pluggable auth system that includes broader 3rd party set of auth providers, including more potentially sophisticated techniques such as JWT.  It does not have any default usage logging, so this would need to be handled manually, but it does support a mechanism for [throttling](http://www.django-rest-framework.org/api-guide/throttling/), which can be customized.  Azavea's [Climate Change API](https://github.com/azavea/climate-change-api) uses this library.


##### Use AWS API Gateway to proxy API requests
AGW could pass requests to existing or new endpoints and comes with a very robust system feature set including usage plans, rate limiting, logging and versioning.  The tooling and execution around this service is relatively unknown on the team.  Also, it would need to authorize requests based on authentication to the application, requiring custom code.


### Decision
We will use the existing Django REST Framework to implement new API endpoints, secured by the default Token Authentication provided by the framework.  We will throttle requests to a configurable amount per minute.  We will have to add an account page that lists the users API key and allows it to be invalided/regenerated.  Validation will be encoded into the endpoints and the application/environment will have a user associated with it, and will use that user's API key against the same endpoints. Basic logging of requests will be done within the Django model/database with attributes confirmed by the client.

### Consequences
Using non-expiring keys is a trade off between security and consumer convenience.  As none of the content is currently protected, it is better to have a low barrier to entry to determine if there is an actual user demand for this feature. If, in the future, a paid tier is added, there are enough workflow updates required to provide an opportunity to revisit that mechanism.

Since we'll be logging to the database, we'll need to provide an interface into that data.  I suggest we keep that simple and create a management task which exports ranges of usage data as a CSV so they can be evaluated in Excel.  If this feature ends up gaining traction, we'll want to invest in in a more robust solution. A DRF plugin that may assist with task can be evaluated [here](http://drf-tracking.readthedocs.io/en/latest/).

Since this will be a public facing API, we should make use of Swagger to generate documentation.

We may be required to upgrade DRF to make use of the latest versions of some of these features.  Upgrades to Django are already planned.
