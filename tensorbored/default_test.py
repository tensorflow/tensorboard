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

from tensorbored import default
from tensorbored.plugins import base_plugin
from tensorbored import test


class FakePlugin(base_plugin.TBPlugin):
    """FakePlugin for testing."""

    plugin_name = "fake"


class FakeEntryPoint:
    """Entry point that fake-loads FakePlugin."""

    def __init__(self, name):
        self.name = name

    def load(self):
        return FakePlugin


class DefaultTest(test.TestCase):
    @mock.patch.object(default, "_get_entry_points")
    def test_get_dynamic_plugin(self, mock_get_eps):
        mock_get_eps.return_value = [FakeEntryPoint("foo")]

        actual_plugins = default.get_dynamic_plugins()

        mock_get_eps.assert_called_once_with("tensorbored_plugins")
        self.assertEqual(actual_plugins, [FakePlugin])


if __name__ == "__main__":
    test.main()
