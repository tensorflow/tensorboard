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

from tensorboard_plugin_example_raw_scalars.util import can_serve_from_static


class URLSafetyTest(unittest.TestCase):
    def test_path_traversal(self):
        """Properly check whether a URL can be served from the static folder."""

        self.assertTrue(can_serve_from_static("static/index.js"))
        self.assertTrue(can_serve_from_static("./static/index.js"))
        self.assertTrue(can_serve_from_static("static/../static/index.js"))

        self.assertFalse(can_serve_from_static("../static/index.js"))
        self.assertFalse(can_serve_from_static("../index.js"))
        self.assertFalse(can_serve_from_static("static2/index.js"))
        self.assertFalse(can_serve_from_static("notstatic/index.js"))
        self.assertFalse(can_serve_from_static("static/../../index.js"))
        self.assertFalse(can_serve_from_static("..%2findex.js"))
        self.assertFalse(can_serve_from_static("%2e%2e/index.js"))
        self.assertFalse(can_serve_from_static("%2e%2e%2findex.js"))


if __name__ == "__main__":
    unittest.main()
