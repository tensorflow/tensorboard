# Copyright 2018 The TensorFlow Authors. All Rights Reserved.
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
"""Unit tests for program package."""

from __future__ import absolute_import
from __future__ import division
from __future__ import print_function

import argparse

import six

from tensorboard import program
from tensorboard import test as tb_test
from tensorboard.plugins import base_plugin
from tensorboard.plugins.core import core_plugin


class TensorBoardTest(tb_test.TestCase):
  """Tests the TensorBoard program."""

  def testPlugins_pluginClass(self):
    tb = program.TensorBoard(plugins=[core_plugin.CorePlugin])
    self.assertIsInstance(tb.plugin_loaders[0], base_plugin.BasicLoader)
    self.assertIs(tb.plugin_loaders[0].plugin_class, core_plugin.CorePlugin)

  def testPlugins_pluginLoaderClass(self):
    tb = program.TensorBoard(plugins=[core_plugin.CorePluginLoader])
    self.assertIsInstance(tb.plugin_loaders[0], core_plugin.CorePluginLoader)

  def testPlugins_pluginLoader(self):
    loader = core_plugin.CorePluginLoader()
    tb = program.TensorBoard(plugins=[loader])
    self.assertIs(tb.plugin_loaders[0], loader)

  def testPlugins_invalidType(self):
    plugin_instance = core_plugin.CorePlugin(base_plugin.TBContext())
    with six.assertRaisesRegex(self, TypeError, 'CorePlugin'):
      tb = program.TensorBoard(plugins=[plugin_instance])

  def testConfigure(self):
    tb = program.TensorBoard(plugins=[core_plugin.CorePluginLoader])
    tb.configure(logdir='foo')
    self.assertEqual(tb.flags.logdir, 'foo')

  def testConfigure_unknownFlag(self):
    tb = program.TensorBoard(plugins=[core_plugin.CorePlugin])
    with six.assertRaisesRegex(self, ValueError, 'Unknown TensorBoard flag'):
      tb.configure(foo='bar')


class WerkzeugServerTest(tb_test.TestCase):
  """Tests the default Werkzeug implementation of TensorBoardServer.

  Mostly useful for IPv4/IPv6 testing. This test should run with only IPv4, only
  IPv6, and both IPv4 and IPv6 enabled.
  """

  class _StubApplication(object):
    pass

  def make_flags(self, **kwargs):
    flags = argparse.Namespace()
    kwargs.setdefault('host', None)
    kwargs.setdefault('bind_all', kwargs['host'] is None)
    for k, v in six.iteritems(kwargs):
      setattr(flags, k, v)
    return flags

  def testMakeServerBlankHost(self):
    # Test that we can bind to all interfaces without throwing an error
    server = program.WerkzeugServer(
        self._StubApplication(),
        self.make_flags(port=0, path_prefix=''))
    self.assertStartsWith(server.get_url(), 'http://')

  def testPathPrefixSlash(self):
    #Test that checks the path prefix ends with one trailing slash
    server = program.WerkzeugServer(
        self._StubApplication(),
        self.make_flags(port=0, path_prefix='/test'))
    self.assertEndsWith(server.get_url(), '/test/')

    server = program.WerkzeugServer(
        self._StubApplication(),
        self.make_flags(port=0, path_prefix='/test/'))
    self.assertEndsWith(server.get_url(), '/test/')

  def testSpecifiedHost(self):
    one_passed = False
    try:
      server = program.WerkzeugServer(
          self._StubApplication(),
          self.make_flags(host='127.0.0.1', port=0, path_prefix=''))
      self.assertStartsWith(server.get_url(), 'http://127.0.0.1:')
      one_passed = True
    except program.TensorBoardServerException:
      # IPv4 is not supported
      pass
    try:
      server = program.WerkzeugServer(
          self._StubApplication(),
          self.make_flags(host='::1', port=0, path_prefix=''))
      self.assertStartsWith(server.get_url(), 'http://[::1]:')
      one_passed = True
    except program.TensorBoardServerException:
      # IPv6 is not supported
      pass
    self.assertTrue(one_passed)  # We expect either IPv4 or IPv6 to be supported


if __name__ == '__main__':
  tb_test.main()
