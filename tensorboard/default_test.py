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
"""Collection of first-party plugins.

This module exists to isolate tensorboard.program from the potentially
heavyweight build dependencies for first-party plugins. This way people
doing custom builds of TensorBoard have the option to only pay for the
dependencies they want.

This module also grants the flexibility to those doing custom builds, to
automatically inherit the centrally-maintained list of standard plugins,
for less repetition.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

try:
  # python version >= 3.3
  from unittest import mock  # pylint: disable=g-import-not-at-top
except ImportError:
  import mock  # pylint: disable=g-import-not-at-top,unused-import

import pkg_resources

from tensorboard import default
from tensorboard.plugins import base_plugin
from tensorboard import test


class FakePlugin(base_plugin.TBPlugin):
  """FakePlugin for testing."""

  plugin_name = 'fake'


class FakeEntryPoint(pkg_resources.EntryPoint):
  """EntryPoint class that fake loads FakePlugin."""

  @staticmethod
  def create():
    """Creates an instance off FakeEntryPoint.

    Returns:
      instance of FakeEntryPoint
    """
    return FakeEntryPoint('foo', 'bar')


  def load(self):
    """Returns FakePlugin instead of resolving module.

    Returns:
      FakePlugin
    """
    return FakePlugin



class DefaultTest(test.TestCase):

  @mock.patch.object(pkg_resources, 'iter_entry_points')
  def test_get_dynamic_plugin(self, mock_iter_entry_points):
    mock_iter_entry_points.return_value = [FakeEntryPoint.create()]

    actual_plugins = default.get_dynamic_plugins()

    mock_iter_entry_points.assert_called_with('tensorboard_plugins')
    self.assertEquals(actual_plugins, [FakePlugin])


if __name__ == "__main__":
  test.main()

