# TensorBoard generic data authentication

@wchargin, 2020-06-15

**Status:** Completed.

## Purpose

The [generic data APIs][data-apis] and [ingestion flows][data-ingestion] are
unauthenticated. This is fine for TensorBoard instances running as a local web
server, and also fine for [TensorBoard.dev][tbdev] because all data is publicly
viewable. But some Google-internal applications that are backed by TensorBoard
need to restrict that certain experiments only be shown to certain users.

We therefore need a way to attach end-user credentials to data provider API
calls, that they may be passed on to a backend server that requires them for
authentication. This document proposes a mechanism for obtaining credentials and
a mechanism for communicating those credentials to data providers.

The main purpose of this document is the “Alternatives considered” section.

[data-apis]: ./generic_data_apis.md
[data-ingestion]: ./generic_data_ingestion.md
[tbdev]: https://tensorboard.dev/

## Credential sources

End-user credentials come in different flavors. For instance, the token may come
from a cookie or from an HTTP header added by a proxy, and may include a raw
bearer token or may need to be exchanged for a forwardable credential via a
remote procedure call. Credential flavors depend on the environment in which the
TensorBoard server is run and the expectations of the backend storage layer, so
TensorBoard core cannot attempt to enumerate them.

Instead, we propose a simple *authentication provider* API, with a single method
that obtains a specific flavor of credential from a request context:

```python
class AuthProvider(metaclass=abc.ABCMeta):
    def authenticate(self, environ):
        """Produce an opaque auth token from a WSGI request environment.

        Returns:
          A Python object representing an auth token, with representation and
          semantics depending on this `AuthProvider` implementation.
        Raises:
          Any `Exception`, usually either a `tensorboard.errors.PublicError` or
          a custom error intended to propagate into WSGI middleware.
        """
        pass
```

Note that we’re assuming that every request is made either anonymously or under
the authority of a single user.

For instance, an auth provider that just validates a simple HMAC (rather than
obtaining a forwardable credential) might look like:

```python
class CookieHmacAuth(AuthProvider):
    def __init__(self, hmac_secret):
        self._hmac_secret = hmac_secret

    def authenticate(self, environ):
        cookies = werkzeug.wrappers.BaseRequest(environ).cookies
        username = validate_hmac(cookies["authToken"], self._hmac_secret)
        if username is None:
            raise errors.PermissionDenied("invalid authentication")
        return username

KEY = CookieHmacAuth  # arbitrary sentinel value, unique among auth providers
```

The administrator of a TensorBoard instance should configure any auth providers
and pass them to the `TensorBoardWSGI` app constructor:

```python
auth_providers = {cookie_hmac_auth.KEY: CookieHmacAuth(_HMAC_SECRET)}
app = application.TensorBoardWSGIApp(..., auth_providers=auth_providers)
```

The backend will make these available to plugins and data providers via an
`AuthContext`, which is just a memoized container whose lifetime is scoped to a
single request:

```python
class AuthContext:
    """Authentication context within the scope of a single request."""

    def get(self, provider_key):
        """Get an auth token from the auth provider with the given key.

        Returns:
          The result of `provider.authenticate(...)` for some auth provider.

        Raises:
          KeyError if no auth provider by the given key is installed, or any
          exception raised by the underlying authenticate method.
        """
        ...  # implementation elided; straightforward memoized function call
```

The provider keys are arbitrary Python values, which do not need to be
serializable; it is convenient to just use the type of the auth provider itself,
as in `cookie_hmac_auth.KEY`.

Thus, with access to an `AuthContext`, a data provider that needs to talk to a
backend using the HMAC-signed username credential from the example above might
write:

```python
username = auth_ctx.get(cookie_hmac_auth.KEY)
self._backend.get_experiments_visible_to(username)
```

The `KeyError` failure mode of `AuthContext.get` should only happen if the
server is misconfigured. A data provider should document what auth providers it
needs, and the server administrator should ensure that all appropriate providers
are installed.

In test code, data providers can receive real `AuthContext`s. The needed keys
can map to either real or fake AuthProvider implementations.

## Credential plumbing

The next question is how to get an `AuthContext` from the request context into
the data provider methods that need to consume it.

We propose introducing a “request context” struct—like the existing `TBContext`,
but for cross-cutting, cross-API properties that only live as long as a request.
For now, the auth context will be the only such property. Thus:

```python
class RequestContext:
    auth: AuthContext  # always present and valid, but may be empty

    def __init__(self, *, auth=None): pass  # elided
    def replace(self, **kwargs): pass  # like `namedtuple._replace`; elided
```

A `RequestContext` will be required as the first positional argument to every
data provider method. A context is required, but may be an “empty context” with
default values for all properties.

A context can be immutably updated like `ctx.replace(p=v)` to obtain a new
context like `ctx` but where property `p` has value `v`.

The new `plugin_util.context` function is a sibling to
`plugin_util.experiment_id`: it pulls a request context off the WSGI
environment. An empty context will be installed by an outer WSGI middleware, and
further middleware can alter the context to add auth providers or make other
modifications.

Thus, plugin code that previously looked like

```python
experiment_id = plugin_util.experiment_id(request.environ)
self._data_provider.list_runs(experiment_id)
```

now looks like:

```python
ctx = plugin_util.context(request.environ)
experiment_id = plugin_util.experiment_id(request.environ)
self._data_provider.list_runs(ctx, experiment_id=experiment_id)
```

And code in the data provider implementation will look like:

```python
def list_runs(self, ctx, *, experiment_id):
    username = ctx.auth.get(cookie_hmac_auth.KEY)
    ...
```

## Migration

To get from the current state to the desired state, data provider methods will
first be migrated to take all arguments as keyword-only. Then, `ctx` will be
introduced as a new positional argument with default value `None`, to be
interpreted as an empty context. Next, all call sites will be updated to pass
`ctx`. Finally, data providers will drop the default value, making `ctx`
required.

## Alternatives considered

### Store `AuthContext` directly on WSGI environment and plumb manually

Instead of bundling the `AuthContext` into a `RequestContext`, we could simply
expose it on the WSGI environment via a new helper `plugin_util.auth_context`
and require all call sites to pass it in to data providers manually. Thus,
plugin code would look like this:

```python
experiment_id = plugin_util.experiment_id(request.environ)
auth = plugin_util.auth_context(request.environ)
self._data_provider.list_runs(experiment_id, auth=auth)
```

And data provider implementation code would look like this:

```python
def list_runs(self, experiment_id, auth):
    ...
```

The main advantage of this approach is that it avoids introducing a new
amorphous context type and that it keeps responsibilities separated with many
small interfaces instead of one dumping ground. The main disadvantage is that it
bloats the signatures for data provider methods with a new mandatory parameter
(if it’s not mandatory, then plugins developed against a data provider that does
not require auth will fail when used with one that does), and that it bloats the
amount of uninteresting plumbing (i.e., noise) at all call sites.

### Let `plugin_util.data_provider` return a partially applied provider

We could remove the `data_provider` field from the main `TBContext` entirely and
require plugins to obtain a data provider on a per-request context with
`plugin_util.data_provider(request.environ)`. This would return a
request-specific data provider all of whose methods are partially applied with
`auth` and perhaps `experiment_id`, too.

This has the context that data provider methods can only be called in a request
context, which seems fine; we don’t want plugins to spawn long-running
background threads, anyway.

A drawback of this approach is that the interface that the
`plugin_util.data_provider(...)` implements is never clearly defined. It’s “a
`DataProvider` but where all `auth` parameters are optional”, which is confusing
when reading code like

```python
data_provider = plugin_util.data_provider(request.environ)
runs = data_provider.list_runs()  # no context!
```

and cross-referencing the `DataProvider.list_runs` docs. If we used type
annotations, this would also be hard to type without a separate, parallel
`AuthenticatedDataProvider` interface, which would be a bit of a mess. It gets
even more confusing if `experiment_id` also takes a default value.

My experience is that constructs that are hard to assign straightforward type
signatures to are best avoided, anyway.

### Pass providers directly to `AuthContext` instead of pre-registering

Clients could directly call `auth_ctx.get(auth_provider)`, where provider is an
`AuthProvider` value rather than a key. The `AuthContext` would still act as a
memoization cache, but would not have a key-value mapping for auth providers.

The downside here is that clients need to have a reference to a specific
provider implementation rather than just the type of credential: e.g., a
`CookieHmacAuth` value rather than just the `cookie_hmac_auth.KEY` constant.
Constructing such a value generally requires configuration (an `hmac_secret`) or
state (an open RPC channel). This would effectively require that the
`AuthProvider`s themselves be dependency-injected wherever they need to go.

This is manageable for data providers, but would be more awkward if other parts
of the application directly need auth, especially plugins (custom plugin loaders
would be a fix, but an awkward one). Letting the auth context itself encapsulate
the actual providers seems semantically reasonable and simplifies those use
cases.

(In some ways, though, the dependency injection is also a benefit, so we may
revisit this down the line.)

### Let `AuthProvider.authenticate` perform WSGI effects

In this model, the `AuthProvider.authenticate` method would basically act as
WSGI middleware. This is useful because some authentication flows (e.g., OAuth2)
need to perform redirects.

We don’t want to “taint” all downstream clients with WSGI effects, though. For
instance, data providers should be able to operate outside of an HTTP context.
So the natural way to do this would be to eagerly evaluate all registered
providers at the beginning of each request. This is undesirable for two reasons.
First, some requests may not need authentication at all; the `/index.html` route
serves a static HTML bundle. Second, some TensorBoard instances may be capable
to talking to many kinds of backends with different authentication providers,
even though on any given request only zero or one are needed. (Imagine an app
that forced you to sign into all of Google, Facebook, Twitter, and AOL before
viewing any content just because you might want to share a post on one of those
platforms.)

Thus, instead of letting `AuthProvider.authenticate` perform WSGI effects, we
encourage it to raise a custom exception type, like `OauthRedirectError`. A WSGI
middleware can catch that exception as it propagates and perform the appropriate
redirects.

### Move `experiment_id` into `RequestContext`

The existing `experiment_id` parameter shows strong parallels with the new
`RequestContext`: it is added by TensorBoard core in middleware, stored on the
WSGI environment, accessed via `plugin_util`, and passed down to data providers
opaquely. It is tempting to remove the experiment ID from the top-level
environment and store it on the `RequestContext` instead. That’s one fewer thing
for plugins to plumb through.

But for all these similarities, an experiment ID and an auth context are quite
different. An experiment ID is data included in the request, and while it’s true
that currently every request corresponds to exactly one experiment ID, that’s
more of an accident than an intentional constraint; cross-experiment requests
absolutely make sense in principle. By contrast, an auth context is a side
channel that sits below the application logic. Much like a
[Golang `context.Context`][golang-ctx], our new `RequestContext` is explicitly
not meant to be a dumping ground for “values that we couldn’t be bothered to
pass explicitly to all the functions that need them”. That way lies darkness, as
untangling dataflow becomes a complex function of runtime state rather than
lexical call graphs.

[golang-ctx]: https://golang.org/pkg/context/#pkg-overview

### Pull `AuthContext` from global state

Hard/impossible to get the threadlocals right (one-to-many request-to-thread).
Usual arguments against shared mutable state also apply.

### Give raw WSGI environment to data providers

Mixes abstraction levels too much.

### Use a single (but pluggable) credential type rather than an AuthContext

(Alternative to “Credential sources”, not “Credential plumbing”.) Not so
attractive when you need a data provider to be able to communicate with multiple
backends, especially lazily.

## Changelog

-   **2020-06-17:** Moved `experiment_id` out of `RequestContext`. Added some
    more alternatives considered in response to feedback.
-   **2020-06-16:** Request for comments.
