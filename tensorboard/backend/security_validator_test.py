# Copyright 2019 The TensorFlow Authors. All Rights Reserved.

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
"""Tests for `tensorboard.backend.security_validator`."""


from unittest import mock

import werkzeug
from werkzeug import test as werkzeug_test
from werkzeug.datastructures import Headers
from werkzeug.wrappers import Response

from tensorboard import test as tb_test
from tensorboard.backend import security_validator
from tensorboard.util import tb_logging

logger = tb_logging.get_logger()

_WARN_PREFIX = "In 3.0, this warning will become an error:\n"


def create_headers(
    content_type="application/json",
    x_content_type_options="nosniff",
    content_security_policy="",
):
    return Headers(
        {
            "Content-Type": content_type,
            "X-Content-Type-Options": x_content_type_options,
            "Content-Security-Policy": content_security_policy,
        }
    )


class SecurityValidatorMiddlewareTest(tb_test.TestCase):
    """Tests for `SecurityValidatorMiddleware`."""

    def make_request_and_maybe_assert_warn(
        self,
        headers,
        expected_warn_substr,
    ):
        @werkzeug.Request.application
        def _simple_app(req):
            return werkzeug.Response("OK", headers=headers)

        app = security_validator.SecurityValidatorMiddleware(_simple_app)
        server = werkzeug_test.Client(app, Response)

        with mock.patch.object(logger, "warning") as mock_warn:
            server.get("")

        if expected_warn_substr is None:
            mock_warn.assert_not_called()
        else:
            mock_warn.assert_called_with(_WARN_PREFIX + expected_warn_substr)

    def make_request_and_assert_no_warn(
        self,
        headers,
    ):
        self.make_request_and_maybe_assert_warn(headers, None)

    def test_validate_content_type(self):
        self.make_request_and_assert_no_warn(
            create_headers(content_type="application/json"),
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(content_type=""),
            "Content-Type is required on a Response",
        )

    def test_validate_x_content_type_options(self):
        self.make_request_and_assert_no_warn(
            create_headers(x_content_type_options="nosniff")
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(x_content_type_options=""),
            'X-Content-Type-Options is required to be "nosniff"',
        )

    def test_validate_csp_text_html(self):
        self.make_request_and_assert_no_warn(
            create_headers(
                content_type="text/html; charset=UTF-8",
                content_security_policy=(
                    "DEFAult-src 'self';script-src https://google.com;"
                    "style-src  'self'   https://example; object-src   "
                ),
            ),
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(
                content_type="text/html; charset=UTF-8",
                content_security_policy="",
            ),
            "Requires default-src for Content-Security-Policy",
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(
                content_type="text/html; charset=UTF-8",
                content_security_policy="default-src *",
            ),
            "Illegal Content-Security-Policy for default-src: *",
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(
                content_type="text/html; charset=UTF-8",
                content_security_policy="default-src 'self';script-src *",
            ),
            "Illegal Content-Security-Policy for script-src: *",
        )

        self.make_request_and_maybe_assert_warn(
            create_headers(
                content_type="text/html; charset=UTF-8",
                content_security_policy=(
                    "script-src * 'sha256-foo' 'nonce-bar';"
                    "style-src http://google.com;object-src *;"
                    "img-src 'unsafe-inline';default-src 'self';"
                    "script-src *       'strict-dynamic'"
                ),
            ),
            "\n".join(
                [
                    "Illegal Content-Security-Policy for script-src: *",
                    "Illegal Content-Security-Policy for script-src: 'nonce-bar'",
                    "Illegal Content-Security-Policy for style-src: http://google.com",
                    "Illegal Content-Security-Policy for object-src: *",
                    "Illegal Content-Security-Policy for img-src: 'unsafe-inline'",
                    "Illegal Content-Security-Policy for script-src: *",
                    "Illegal Content-Security-Policy for script-src: 'strict-dynamic'",
                ]
            ),
        )

    def test_validate_csp_multiple_csp_headers(self):
        base_headers = create_headers(
            content_type="text/html; charset=UTF-8",
            content_security_policy=(
                "script-src * 'sha256-foo';" "style-src http://google.com"
            ),
        )
        base_headers.add(
            "Content-Security-Policy",
            "default-src 'self';script-src 'nonce-bar';object-src *",
        )

        self.make_request_and_maybe_assert_warn(
            base_headers,
            "\n".join(
                [
                    "Illegal Content-Security-Policy for script-src: *",
                    "Illegal Content-Security-Policy for style-src: http://google.com",
                    "Illegal Content-Security-Policy for script-src: 'nonce-bar'",
                    "Illegal Content-Security-Policy for object-src: *",
                ]
            ),
        )

    def test_validate_csp_non_text_html(self):
        self.make_request_and_assert_no_warn(
            create_headers(
                content_type="application/xhtml",
                content_security_policy=(
                    "script-src * 'sha256-foo' 'nonce-bar';"
                    "style-src http://google.com;object-src *;"
                ),
            ),
        )


if __name__ == "__main__":
    tb_test.main()
