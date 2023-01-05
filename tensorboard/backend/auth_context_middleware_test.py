# Copyright 2023 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for `tensorboard.backend.auth_context_middleware`."""
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard import auth
from tensorboard import context
from tensorboard import test as tb_test
from tensorboard.backend import auth_context_middleware


class SimpleAuthProvider(auth.AuthProvider):
    """Simple AuthProvider that returns the value it is initialized with."""

    def __init__(self, credential):
        self._credential = credential

    def authenticate(self, environ):
        return self._credential


def _create_auth_provider_verifier_app(expected_auth_key):
    """Generates a WSGI application for verifying AuthContextMiddleware.

    It should be placed after AuthContextMiddleware in the WSGI handler chain.
    It will generate a credential using the AuthContext populated by
    AuthContextMiddleware.

    Args:
      expected_auth_key: The auth key to be used for invoking the AuthContext.
        This key should correspond to the auth_providers used to configure
        the AuthContextMiddleware .
    """

    def _app(environ, start_response):
        ctx = context.from_environ(environ)
        credential = ctx.auth.get(expected_auth_key)
        start_response("200 OK", [("Content-Type", "text\plain")])
        return f"credential: {credential}"

    return _app


class AuthContextMiddlewareTest(tb_test.TestCase):
    """Tests for `AuthContextMiddleware`"""

    def test_populates_auth_context(self):
        app = auth_context_middleware.AuthContextMiddleware(
            _create_auth_provider_verifier_app("my_key"),
            {"my_key": SimpleAuthProvider("my_credential")},
        )

        server = werkzeug_test.Client(app, wrappers.Response)
        response = server.get("")
        self.assertEqual(
            "credential: my_credential", response.get_data().decode()
        )


if __name__ == "__main__":
    tb_test.main()
