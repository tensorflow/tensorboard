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
"""Tests for `tensorboard.backend.path_prefix`."""


import json

import werkzeug
from werkzeug import test as werkzeug_test

from tensorboard import errors
from tensorboard import test as tb_test
from tensorboard.backend import path_prefix


class PathPrefixMiddlewareTest(tb_test.TestCase):
    """Tests for `PathPrefixMiddleware`."""

    def _echo_app(self, environ, start_response):
        # https://www.python.org/dev/peps/pep-0333/#environ-variables
        data = {
            "path": environ.get("PATH_INFO", ""),
            "script": environ.get("SCRIPT_NAME", ""),
        }
        body = json.dumps(data, sort_keys=True)
        start_response("200 OK", [("Content-Type", "application/json")])
        return [body]

    def _assert_ok(self, response, path, script):
        self.assertEqual(response.status_code, 200)
        actual = json.loads(response.get_data())
        expected = dict(path=path, script=script)
        self.assertEqual(actual, expected)

    def test_bad_path_prefix_without_leading_slash(self):
        with self.assertRaises(ValueError) as cm:
            path_prefix.PathPrefixMiddleware(self._echo_app, "hmm")
        msg = str(cm.exception)
        self.assertIn("must start with slash", msg)
        self.assertIn(repr("hmm"), msg)

    def test_bad_path_prefix_with_trailing_slash(self):
        with self.assertRaises(ValueError) as cm:
            path_prefix.PathPrefixMiddleware(self._echo_app, "/hmm/")
        msg = str(cm.exception)
        self.assertIn("must not end with slash", msg)
        self.assertIn(repr("/hmm/"), msg)

    def test_empty_path_prefix(self):
        app = path_prefix.PathPrefixMiddleware(self._echo_app, "")
        server = werkzeug_test.Client(app, werkzeug.wrappers.Response)

        with self.subTest("at empty"):
            self._assert_ok(server.get(""), path="", script="")

        with self.subTest("at root"):
            self._assert_ok(server.get("/"), path="/", script="")

        with self.subTest("at subpath"):
            response = server.get("/foo/bar")
            self._assert_ok(server.get("/foo/bar"), path="/foo/bar", script="")

    def test_nonempty_path_prefix(self):
        app = path_prefix.PathPrefixMiddleware(self._echo_app, "/pfx")
        server = werkzeug_test.Client(app, werkzeug.wrappers.Response)

        with self.subTest("at root"):
            response = server.get("/pfx")
            self._assert_ok(response, path="", script="/pfx")

        with self.subTest("at root with slash"):
            response = server.get("/pfx/")
            self._assert_ok(response, path="/", script="/pfx")

        with self.subTest("at subpath"):
            response = server.get("/pfx/foo/bar")
            self._assert_ok(response, path="/foo/bar", script="/pfx")

        with self.subTest("at non-path-component extension"):
            with self.assertRaises(errors.NotFoundError):
                server.get("/pfxz")

        with self.subTest("above path prefix"):
            with self.assertRaises(errors.NotFoundError):
                server.get("/hmm")

    def test_composition(self):
        app = self._echo_app
        app = path_prefix.PathPrefixMiddleware(app, "/bar")
        app = path_prefix.PathPrefixMiddleware(app, "/foo")
        server = werkzeug_test.Client(app, werkzeug.wrappers.Response)

        response = server.get("/foo/bar/baz/quux")
        self._assert_ok(response, path="/baz/quux", script="/foo/bar")


if __name__ == "__main__":
    tb_test.main()
