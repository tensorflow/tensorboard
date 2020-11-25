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

import ntpath
import posixpath
import unittest
from unittest import mock

from werkzeug import test
from werkzeug import wrappers

from tensorboard.plugins import base_plugin
from tensorboard_plugin_example_raw_scalars import plugin


def is_path_safe(path):
    """Returns the result depending on the plugin's static file handler."""
    example_plugin = plugin.ExampleRawScalarsPlugin(base_plugin.TBContext())
    serve_static_file = example_plugin._serve_static_file

    client = test.Client(serve_static_file, wrappers.BaseResponse)
    response = client.get(plugin._PLUGIN_DIRECTORY_PATH_PART + path)
    return response.status_code == 200


class UrlSafetyTest(unittest.TestCase):
    def test_path_traversal(self):
        """Properly check whether a URL can be served from the static folder."""
        with mock.patch("builtins.open", mock.mock_open(read_data="data")):
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
                    "static/../..\\org_tensorflow_tensorboard\\static\\index.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/../../org_tensorflow_tensorboard/static/index.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/%2e%2e%2f%2e%2e%5corg_tensorflow_tensorboard%5cstatic%5cindex.js"
                )
            )
            self.assertFalse(
                is_path_safe(
                    "static/%2e%2e%2f%2e%2e%2forg_tensorflow_tensorboard%2fstatic%2findex.js"
                )
            )

            # Test with OS specific path modules.
            with mock.patch("os.path", posixpath):
                self.assertTrue(is_path_safe("static/\\index.js"))

            with mock.patch("os.path", ntpath):
                self.assertFalse(is_path_safe("static/\\index.js"))


if __name__ == "__main__":
    unittest.main()
