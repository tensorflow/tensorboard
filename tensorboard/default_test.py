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

from importlib import metadata

from tensorboard import default
from tensorboard.plugins import base_plugin
from tensorboard import test


class FakePlugin(base_plugin.TBPlugin):
    """FakePlugin for testing."""

    plugin_name = "fake"


class FakeEntryPoint(metadata.EntryPoint):
    """EntryPoint class that fake loads FakePlugin."""

    @classmethod
    def create(cls):
        """Creates an instance of FakeEntryPoint.

        Returns:
          instance of FakeEntryPoint
        """
        return cls("foo", "bar", "tensorboard_plugins")

    def load(self):
        """Returns FakePlugin instead of loading module.

        Returns:
          FakePlugin
        """
        return FakePlugin


class DefaultTest(test.TestCase):
    @mock.patch.object(metadata, "entry_points")
    def test_get_dynamic_plugin(self, mock_entry_points):
        fake_eps = [FakeEntryPoint.create()]
        mock_entry_points.return_value.select.return_value = fake_eps

        actual_plugins = default.get_dynamic_plugins()

        mock_entry_points.assert_called_once()
        mock_entry_points.return_value.select.assert_called_with(
            group="tensorboard_plugins"
        )
        self.assertEqual(actual_plugins, [FakePlugin])


if __name__ == "__main__":
    test.main()
