# Copyright 2022 The TensorFlow Authors. All Rights Reserved.
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
"""Middleware for injecting client-side feature flags into the Context."""

import json

from tensorboard import context
from tensorboard import errors


class ClientFeatureFlagsMiddleware:
    """Middleware for injecting client-side feature flags into the Context.

    The client webapp is expected to include a json-serialized version of its
    FeatureFlags in the `X-TensorBoard-Feature-Flags` header. This middleware
    extracts the header value and converts it into the client_feature_flags
    property for the DataProvider's Context object, where client_feature_flags
    is a Dict of string keys and arbitrary value types.
    """

    def __init__(self, application):
        """Initializes this middleware.

        Args:
          application: The WSGI application to wrap (see PEP 3333).
        """
        self._application = application

    def __call__(self, environ, start_response):
        possible_feature_flags = environ.get("HTTP_X_TENSORBOARD_FEATURE_FLAGS")
        if not possible_feature_flags:
            return self._application(environ, start_response)

        try:
            client_feature_flags = json.loads(possible_feature_flags)
        except json.JSONDecodeError:
            raise errors.InvalidArgumentError(
                "X-TensorBoard-Feature-Flags cannot be JSON decoded."
            )

        if not isinstance(client_feature_flags, dict):
            raise errors.InvalidArgumentError(
                "X-TensorBoard-Feature-Flags cannot be decoded to a dict."
            )

        ctx = context.from_environ(environ).replace(
            client_feature_flags=client_feature_flags
        )
        context.set_in_environ(environ, ctx)

        return self._application(environ, start_response)
