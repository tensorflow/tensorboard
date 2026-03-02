# Copyright 2017 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for `tensorboard.default`."""

from unittest import mock

from tensorboard import default
from tensorboard import test


class FakeEntryPoint:
    def __init__(self, value):
        self._value = value

    def load(self):
        return self._value


class DefaultTest(test.TestCase):
    @mock.patch.object(default, "_iter_entry_points")
    def test_get_dynamic_plugin(self, mock_iter_entry_points):
        fake_plugin = object()
        mock_iter_entry_points.return_value = [FakeEntryPoint(fake_plugin)]

        actual_plugins = default.get_dynamic_plugins()

        mock_iter_entry_points.assert_called_with("tensorboard_plugins")
        self.assertEqual(actual_plugins, [fake_plugin])


if __name__ == "__main__":
    test.main()
