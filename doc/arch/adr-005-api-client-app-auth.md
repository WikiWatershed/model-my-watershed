# Geoprocessing API: Only Allow Anonymous Requests From The Client App

## Context

We're creating a [proper, publicly documented API](https://github.com/WikiWatershed/model-my-watershed/blob/develop/src/mmw/apps/geoprocessing_api/views.py) around our analyze and 
RWD endpoints: the [Geoprocessing API.](https://github.com/WikiWatershed/model-my-watershed/blob/develop/doc/arch/adr-004-geoprocessing-api.md) The analyze and RWD endpoints have
always had allow-any access; we'd now like to secure them via token authentication
so that we can better track individual users, prevent users from sending off too many
requests, revoke the access of problematic users, and some day maybe add a 
paid tier of use.

Enforcing token authentication on these previously open endpoints causes
a problem for our client app; the client app consumes the same API, and
want to continue to allow unauthenticated users access to these endpoints
via the app. We need a way to identify the client app as a special case
from which the app should allow unrestricted requests.

Because everything we send to and from the client is exposed to the app user,
any mechanism we give the client app to identify itself will be fairly
easy to uncover and then fake by anyone trying to get un-checked access to the
API. With this in mind our solution should prioritize not be overly complicated/difficult
for us when we know there's no truly secure solution (barring doing all our rendering
server-side).

Some possibilities are:

1. Give each environment of the client app its own API token
   - Keeps a single system for API authentication; easy to reason about;
     as a bonus will allow us to cycle the client app's token if someone
     decides to start using it
   
1. Set a special, is-client-app flag that the API would check to determine if authentication was necessary
   - To set the flag we'd have to know the request was from the client app in
     the first place. Preliminary checks for doing this via `http_referer`
     were unsuccessful, which would leave doing this via custom header (or some
     other part of the request). Setting a `X-IsClientApp` custom header might
     be overly naive or hacky, and could result in a lot of conditional logic
     
1. Do (1) and also enforce the `HTTP_REFERER` header be from an expected domain.
[Google Maps ](https://developers.google.com/maps/documentation/javascript/get-api-key#key-restrictions)
does this. Even though such headers are easily spoofed by a client outside of a browser,
they're fairly effective for browser-based apps and for naive use from a non-browser client

## Decision

**Give the client app its own API token**

Setting up the client app with its own API token will result a cleaner
architecture for the API. All users use a token, no exceptions. In addition to
the simpler mental model the API token method provides, we'll also gain an added
level of token enforcement; if some API user tries to programmatically use the client
app's token instead of their own, we'll be able to easily cycle the client app's token 
to de-incentivize them. 

One easy way to cycle the token:
```
./manage.py drf_create_token -r <client_app_username>
```

We can always implement (3) as an enhancement later on.

##### When should the client app send its token

For all Geoprocessing API requests, whether there's a logged-in user's token available
to use or not, ie., we will continue to use a user's credentials when needed for the
application endpoints.


##### How the client app should get the token

If we hard-code the token on the frontend (or anywhere), we'll have to deploy any time we need
to cycle the token. We should instead pass the token to the client app via `clientSettings`. 

##### How the server should get the token

To get the token to put in the client's settings, the server can look up the
token from the `authtoken_token` table via the client app's `user_id`.
The `user_id` should remain secret so that there's no programmatic way get
the token outside of swiping it off the client app.

## Consequences

#### Backdoor to the API
As discussed in [Context](#Context), allowing the client app to make requests without a user creates a 
backdoor into the API. This is acceptable because up until now we've allowed unrestricted API access
(we just haven't advertised the API as something you could use.) There's also no sensitive data available
via the API. While it's not ideal that someone could use the client app token to make unlimited,
resource-intensive requests unchecked the decision will at least allow us to cycle the token whenever
there's an issue.

#### More Complex Throttling

We want to throttle users of the API, and if the client app is just another, regular user
of the API with a token it would get throttled the same. All guest MMW users in the world
would share a cumalitive number of requests per minute.

To fix this we'll need to treat the client app's token as a special case for throttling: 

if token is client app:

don't throttle or cache number of requests per IP 
(like [AnonRateThrottle](http://www.django-rest-framework.org/api-guide/throttling/#anonratethrottle)).
There may be difficulties with this related to which IP DRF uses;
it may use that of our load balancer instead of the client's. This also may
cause issues for our classroom users if set too low.

else:

cache number of requests per token (like [UserRateThrottle](http://www.django-rest-framework.org/api-guide/throttling/#userratethrottle))

#### Dev Setup

The `user_id` the app server uses to get the client's token should be fairly
constant for the life of staging and production. Each developer's machine,
however, will have different database instances and, therefore, different
client app `user_id`'s.

We could:
1. Use some special email or name like `clientapp09212017` for the app server to look up the `user_id` to get the token. This would add a level
of indirection, but would allow production, staging and our local machines
to share a migration that creates the user, and share code to look up the id.
There's precedence for this setup at Azavea in Raster Foundry's airflow user.

1. Store the `user_id` itself as an environment variable. A migration could
create the user and write its id to an envfile. We would have to include the envfile in our `.gitignore`, and be careful not to tamper with it.


