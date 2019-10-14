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
"""Tests for `tensorboard.backend.frame_ancestors`."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import json

import werkzeug
from werkzeug import test as werkzeug_test

from tensorboard import test as tb_test
from tensorboard.backend import frame_ancestors


class FrameAncestorsTest(tb_test.TestCase):
  """Tests for `FrameAncestorsMiddleware`."""

  def _bootstrap(self, flag):
    app = frame_ancestors.FrameAncestorsMiddleware(self._echo_app, flag)
    return werkzeug_test.Client(app, werkzeug.BaseResponse)

  def _echo_app(self, environ, start_response):
    path = environ.get("PATH_INFO", "")
    if path == "html":
      start_response("200 OK", [("Content-Type", "text/html")])
      return "<b>hello</b>world"
    if path == "json":
      start_response("200 OK", [("Content-Type", "application/json")])
      return '{"hello": "world"}'
    start_response("404 NOT FOUND", [("Content-Type", "text/plain")])
    return "meow"

  def _assert_frame_ancestors(self, response, expected_frame_ancestors):
    csp = response.headers.get("Content-Security-Policy", None)
    if expected_frame_ancestors is None:
      self.assertEqual(csp, None)
    else:
      self.assertEqual(csp, "frame-ancestors %s;" % expected_frame_ancestors)

  def test_html_response(self):
    response = self._bootstrap("unsafe").get("html")
    self._assert_frame_ancestors(response, "*")

  def test_flag(self):
    response = self._bootstrap("none").get("html")
    self._assert_frame_ancestors(response, "'none'")

    response = self._bootstrap("colab").get("html")
    self._assert_frame_ancestors(
        response, "https://*.googleusercontent.com https://*.google.com")

    response = self._bootstrap("notebook").get("html")
    self._assert_frame_ancestors(response, "*")

    response = self._bootstrap("unsafe").get("html")
    self._assert_frame_ancestors(response, "*")

  def test_non_htmls(self):
    response = self._bootstrap("none").get("json")
    self._assert_frame_ancestors(response, None)

    response = self._bootstrap("none").get("")
    self._assert_frame_ancestors(response, None)


if __name__ == "__main__":
  tb_test.main()
