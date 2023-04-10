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
"""Tests for `tensorboard.backend.client_feature_flags`."""


import json
from werkzeug import test as werkzeug_test
from werkzeug import wrappers

from tensorboard import context
from tensorboard import errors
from tensorboard import test as tb_test
from tensorboard.backend import client_feature_flags


class ClientFeatureFlagsMiddlewareTest(tb_test.TestCase):
    """Tests for `ClientFeatureFlagsMiddleware`."""

    def _echo_app(self, environ, start_response):
        # https://www.python.org/dev/peps/pep-0333/#environ-variables
        data = {
            "client_feature_flags": context.from_environ(
                environ
            ).client_feature_flags,
        }
        body = json.dumps(data)
        start_response("200 OK", [("Content-Type", "application/json")])
        return [body]

    def _assert_ok(self, response, client_feature_flags):
        self.assertEqual(response.status_code, 200)
        actual = json.loads(response.get_data())
        expected = dict(client_feature_flags=client_feature_flags)
        self.assertEqual(actual, expected)

    def test_no_header(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get("")
        self._assert_ok(response, {})

    def test_no_query_string(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get("")
        self._assert_ok(response, {})

    def test_header_with_no_value(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get("", headers=[("X-TensorBoard-Feature-Flags", "")])
        self._assert_ok(response, {})

    def test_query_string_with_no_value(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get("", query_string={"tensorBoardFeatureFlags": ""})
        self._assert_ok(response, {})

    def test_header_with_no_flags(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get(
            "", headers=[("X-TensorBoard-Feature-Flags", "{}")]
        )
        self._assert_ok(response, {})

    def test_query_string_with_no_flags(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get(
            "", query_string={"tensorBoardFeatureFlags": "{}"}
        )
        self._assert_ok(response, {})

    def test_header_with_client_feature_flags(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get(
            "",
            headers=[
                (
                    "X-TensorBoard-Feature-Flags",
                    '{"str": "hi", "bool": true, "strArr": ["one", "two"]}',
                )
            ],
        )
        self._assert_ok(
            response,
            {
                "str": "hi",
                "bool": True,
                "strArr": ["one", "two"],
            },
        )

    def test_query_string_with_client_feature_flags(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get(
            "",
            query_string={
                "tensorBoardFeatureFlags": '{"str": "hi", "bool": true, "strArr": ["one", "two"]}'
            },
        )
        self._assert_ok(
            response,
            {
                "str": "hi",
                "bool": True,
                "strArr": ["one", "two"],
            },
        )

    def test_header_with_json_not_decodable(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        with self.assertRaisesRegex(
            errors.InvalidArgumentError, "cannot be JSON decoded."
        ):
            response = server.get(
                "",
                headers=[
                    (
                        "X-TensorBoard-Feature-Flags",
                        "some_invalid_json {} {}",
                    )
                ],
            )

    def test_query_string_with_json_not_decodable(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        with self.assertRaisesRegex(
            errors.InvalidArgumentError, "cannot be JSON decoded."
        ):
            response = server.get(
                "",
                query_string={
                    "tensorBoardFeatureFlags": "some_invalid_json {} {}",
                },
            )

    def test_header_with_json_not_dict(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        with self.assertRaisesRegex(
            errors.InvalidArgumentError, "cannot be decoded to a dict"
        ):
            response = server.get(
                "",
                headers=[
                    (
                        "X-TensorBoard-Feature-Flags",
                        '["not", "a", "dict"]',
                    )
                ],
            )

    def test_query_string_with_json_not_dict(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        with self.assertRaisesRegex(
            errors.InvalidArgumentError, "cannot be decoded to a dict"
        ):
            response = server.get(
                "",
                query_string={
                    "tensorBoardFeatureFlags": '["not", "a", "dict"]',
                },
            )

    def test_header_feature_flags_take_precedence(self):
        app = client_feature_flags.ClientFeatureFlagsMiddleware(self._echo_app)
        server = werkzeug_test.Client(app, wrappers.Response)

        response = server.get(
            "",
            headers=[
                (
                    "X-TensorBoard-Feature-Flags",
                    '{"a": "1", "b": "2"}',
                )
            ],
            query_string={"tensorBoardFeatureFlags": '{"a": "2", "c": "3"}'},
        )
        self._assert_ok(
            response,
            {
                "a": "1",
                "b": "2",
                "c": "3",
            },
        )


if __name__ == "__main__":
    tb_test.main()
