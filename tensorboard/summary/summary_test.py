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
import sys
import unittest

import tensorboard.summary as tb_summary
import tensorboard.summary.v1 as tb_summary_v1
import tensorboard.summary.v2 as tb_summary_v2


class SummaryExportsBaseTest(object):
  module = None
  plugins = None
  allowed = frozenset()

  def test_each_plugin_has_an_export(self):
    for plugin in self.plugins:
      self.assertIsInstance(getattr(self.module, plugin), collections.Callable)

  def test_plugins_export_pb_functions(self):
    for plugin in self.plugins:
      self.assertIsInstance(
          getattr(self.module, '%s_pb' % plugin), collections.Callable)

  def test_all_exports_correspond_to_plugins(self):
    exports = [name for name in dir(self.module) if not name.startswith('_')]
    bad_exports = [
        name for name in exports
        if name not in self.allowed and not any(
            name == plugin or name.startswith('%s_' % plugin)
            for plugin in self.plugins)
    ]
    if bad_exports:
      self.fail(
          'The following exports do not correspond to known standard '
          'plugins: %r. Please mark these as private by prepending an '
          'underscore to their names, or, if they correspond to a new '
          'plugin that you are certain should be part of the public API '
          'forever, add that plugin to the STANDARD_PLUGINS set in this '
          'module.' % bad_exports)


class SummaryExportsTest(SummaryExportsBaseTest, unittest.TestCase):
  module = tb_summary
  allowed = frozenset(('v1', 'v2'))
  plugins = frozenset([
    'audio',
    'custom_scalar',
    'histogram',
    'image',
    'pr_curve',
    'scalar',
    'text',
  ])


class SummaryExportsV1Test(SummaryExportsBaseTest, unittest.TestCase):
  module = tb_summary_v1
  plugins = frozenset([
    'audio',
    'custom_scalar',
    'histogram',
    'image',
    'pr_curve',
    'scalar',
    'text',
  ])


class SummaryExportsV2Test(SummaryExportsBaseTest, unittest.TestCase):
  module = tb_summary_v2
  plugins = frozenset([
    'audio',
    'histogram',
    'image',
    'scalar',
    'text',
  ])

  def test_plugins_export_pb_functions(self):
    self.skipTest('V2 summary API _pb functions are not finalized yet')


class SummaryDepTest(unittest.TestCase):

  def test_no_tf_dep(self):
    # Check as a precondition that TF wasn't already imported.
    self.assertEqual('notfound', sys.modules.get('tensorflow', 'notfound'))
    # Check that referencing summary API symbols still avoids a TF import
    # as long as we don't actually invoke any API functions.
    for module in (tb_summary, tb_summary_v1, tb_summary_v2):
      print(dir(module))
      print(module.scalar)
    self.assertEqual('notfound', sys.modules.get('tensorflow', 'notfound'))


if __name__ == '__main__':
  unittest.main()
