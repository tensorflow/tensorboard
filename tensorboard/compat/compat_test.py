# Copyright 2026 The TensorFlow Authors. All Rights Reserved.
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

"""Tests for tensorboard.compat lazy exports."""

import unittest


class CompatTest(unittest.TestCase):
    def test_tf_export(self):
        from tensorboard.compat import tf

        self.assertTrue(hasattr(tf, "compat"))

    def test_tf2_export(self):
        from tensorboard.compat import tf2

        self.assertTrue(hasattr(tf2, "summary"))


if __name__ == "__main__":
    unittest.main()
