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
"""Tests for the example plugin."""

import unittest

import werkzeug

from tensorboard_plugin_example_raw_scalars import plugin

serve_static_file = plugin.ExampleRawScalarsPlugin._serve_static_file
static_dir_prefix = plugin._PLUGIN_DIRECTORY_PATH_PART


def is_path_safe(path):
    """Returns the result depending on the plugin's static file handler."""
    path = static_dir_prefix + path
    result = []

    def mock_start_response(status, headers):
        result.append(status)

    environ = werkzeug.test.create_environ(path)
    serve_static_file({}, environ, mock_start_response)
    return len(result) == 1 and result[0] == "200 OK"


class URLSafetyTest(unittest.TestCase):
    def test_path_traversal(self):
        """Properly check whether a URL can be served from the static folder."""
        self.assertTrue(is_path_safe("static/index.js"))
        self.assertTrue(is_path_safe("./static/index.js"))
        self.assertTrue(is_path_safe("static/../static/index.js"))

        self.assertFalse(is_path_safe("../static/index.js"))
        self.assertFalse(is_path_safe("../index.js"))
        self.assertFalse(is_path_safe("static2/index.js"))
        self.assertFalse(is_path_safe("notstatic/index.js"))
        self.assertFalse(is_path_safe("static/../../index.js"))
        self.assertFalse(is_path_safe("..%2findex.js"))
        self.assertFalse(is_path_safe("%2e%2e/index.js"))
        self.assertFalse(is_path_safe("%2e%2e%2findex.js"))
        self.assertFalse(
            is_path_safe(
                "static/../../org_tensorflow_tensorboard/static/index.js"
            )
        )


if __name__ == "__main__":
    unittest.main()
