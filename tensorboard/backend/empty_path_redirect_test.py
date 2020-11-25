# Copyright 2019 The TensorFlow Authors. All Rights Reserved.
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
"""Tests for `tensorboard.backend.empty_path_redirect`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function


import werkzeug
from werkzeug import test as werkzeug_test

from tensorboard import test as tb_test
from tensorboard.backend import empty_path_redirect


class EmptyPathRedirectMiddlewareTest(tb_test.TestCase):
    """Tests for `EmptyPathRedirectMiddleware`."""

    def setUp(self):
        super(EmptyPathRedirectMiddlewareTest, self).setUp()
        app = werkzeug.Request.application(
            lambda req: werkzeug.Response(req.path)
        )
        app = empty_path_redirect.EmptyPathRedirectMiddleware(app)
        app = self._lax_strip_foo_middleware(app)
        self.app = app
        self.server = werkzeug_test.Client(
            self.app, werkzeug.wrappers.BaseResponse
        )

    def _lax_strip_foo_middleware(self, app):
        """Strips a `/foo` prefix if it exists; no-op otherwise."""

        def wrapper(environ, start_response):
            path = environ.get("PATH_INFO", "")
            if path.startswith("/foo"):
                environ["PATH_INFO"] = path[len("/foo") :]
                environ["SCRIPT_NAME"] = "/foo"
            return app(environ, start_response)

        return wrapper

    def test_normal_route_not_redirected(self):
        response = self.server.get("/foo/bar")
        self.assertEqual(response.status_code, 200)

    def test_slash_not_redirected(self):
        response = self.server.get("/foo/")
        self.assertEqual(response.status_code, 200)

    def test_empty_redirected_with_script_name(self):
        response = self.server.get("/foo")
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers["Location"], "/foo/")

    def test_empty_redirected_with_blank_script_name(self):
        response = self.server.get("")
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers["Location"], "/")


if __name__ == "__main__":
    tb_test.main()
