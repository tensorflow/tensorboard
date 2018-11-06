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
"""API tests for the `tensorboard.summary` module.

These tests are especially important because this module is the standard
public entry point for end users, so we should be as careful as possible
to ensure that we export the right things.
"""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import collections

from tensorboard.compat import tf
import tensorboard.summary as tb_summary
import tensorboard.summary.v1 as tb_summary_v1
import tensorboard.summary.v2 as tb_summary_v2


STANDARD_PLUGINS = frozenset([
    'audio',
    'custom_scalar',
    'histogram',
    'image',
    'pr_curve',
    'scalar',
    'text',
])


class SummaryExportsBaseTest(object):
  module = None

  def test_each_plugin_has_an_export(self):
    for plugin in STANDARD_PLUGINS:
      self.assertIsInstance(getattr(self.module, plugin), collections.Callable)

  def test_plugins_export_pb_functions(self):
    for plugin in STANDARD_PLUGINS:
      self.assertIsInstance(
          getattr(self.module, '%s_pb' % plugin), collections.Callable)

  def test_all_exports_correspond_to_plugins(self):
    exports = [name for name in dir(self.module) if not name.startswith('_')]
    allowed = frozenset(
        ('absolute_import', 'division', 'print_function', 'v1', 'v2'))
    bad_exports = [
        name for name in exports
        if name not in allowed and not any(
            name == plugin or name.startswith('%s_' % plugin)
            for plugin in STANDARD_PLUGINS)
    ]
    if bad_exports:
      self.fail(
          'The following exports do not correspond to known standard '
          'plugins: %r. Please mark these as private by prepending an '
          'underscore to their names, or, if they correspond to a new '
          'plugin that you are certain should be part of the public API '
          'forever, add that plugin to the STANDARD_PLUGINS set in this '
          'module.' % bad_exports)


class SummaryExportsTest(SummaryExportsBaseTest, tf.test.TestCase):
  module = tb_summary


class SummaryExportsV1Test(SummaryExportsBaseTest, tf.test.TestCase):
  module = tb_summary_v1


class SummaryExportsV2Test(SummaryExportsBaseTest, tf.test.TestCase):
  module = tb_summary_v2


if __name__ == '__main__':
  tf.test.main()
