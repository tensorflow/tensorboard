# Copyright 2020 The TensorFlow Authors. All Rights Reserved.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.
# ==============================================================================
"""Request-scoped context."""

from tensorboard import auth as auth_lib


# A `RequestContext` value is stored on WSGI environments under this key.
_WSGI_KEY = "tensorboard.request_context"


class RequestContext(object):
    """Container of request-scoped values.

    This context is for cross-cutting concerns: authentication,
    authorization, auditing, internationalization, logging, and so on.
    It is not simply for passing commonly used parameters to functions.

    `RequestContext` values are to be treated as immutable.

    Fields:
      auth: An `AuthContext`, which may be empty but is never `None`.
    """

    def __init__(self, auth=None):
        """Create a request context.

        The argument list is sorted and may be extended in the future;
        therefore, callers must pass only named arguments to this
        initializer.

        Args:
          See "Fields" on class docstring. All arguments are optional
          and will be replaced with default values if appropriate.
        """
        self._auth = auth if auth is not None else auth_lib.AuthContext.empty()

    @property
    def auth(self):
        return self._auth

    def replace(self, **kwargs):
        """Create a copy of this context with updated key-value pairs.

        Analogous to `namedtuple._replace`. For example, to create a new
        request context like `ctx` but with auth context `auth`, call
        `ctx.replace(auth=auth)`.

        Args:
          As to `__init__`.

        Returns:
          A new context like this one but with the specified updates.
        """
        kwargs.setdefault("auth", self.auth)
        return type(self)(**kwargs)


def from_environ(environ):
    """Get a `RequestContext` from a WSGI environment.

    See also `set_in_environ`.

    Args:
      environ: A WSGI environment (see PEP 3333).

    Returns:
      The `RequestContext` stored in the WSGI environment, or an empty
      `RequestContext` if none is stored.
    """
    result = environ.get(_WSGI_KEY)
    return result if result is not None else RequestContext()


def set_in_environ(environ, ctx):
    """Set the `RequestContext` in a WSGI environment.

    After `set_in_environ(e, ctx)`, `from_environ(e) is ctx`. The input
    environment is mutated.

    Args:
      environ: A WSGI environment to update.
      ctx: A new `RequestContext` value.
    """
    environ[_WSGI_KEY] = ctx
